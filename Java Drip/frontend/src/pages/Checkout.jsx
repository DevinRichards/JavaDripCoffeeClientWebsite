import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createSquareCheckout, fetchLocations, fetchPaymentConfig, submitOrder } from '../api';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import Reveal from '../components/Reveal';

const DOORDASH_URL = 'https://www.doordash.com/store/java-drip-coffee-1307-e-historic-highway-66-gallup-35017583/75317750/';
const PICKUP_SLOT_INTERVAL_MINUTES = 15;

function parseClockTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return (hours * 60) + minutes;
}

function formatMinutesAsLabel(totalMinutes) {
  const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  let hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const meridiem = hours >= 12 ? 'PM' : 'AM';

  hours %= 12;
  if (hours === 0) hours = 12;

  return `${hours}:${String(minutes).padStart(2, '0')} ${meridiem}`;
}

function getLocationHoursForToday(location, now = new Date()) {
  if (!location) return null;

  const day = now.getDay();
  const hoursText = day === 0
    ? (location.hours_sunday || location.hours_weekend)
    : day === 6
      ? (location.hours_saturday || location.hours_weekend)
      : location.hours_weekday;
  const matches = String(hoursText || '').match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];

  if (matches.length < 2) return null;

  const openMinutes = parseClockTime(matches[0]);
  const closeMinutes = parseClockTime(matches[1]);

  if (openMinutes == null || closeMinutes == null) return null;

  return {
    label: hoursText,
    openMinutes,
    closeMinutes,
  };
}

function roundUpToInterval(totalMinutes, interval) {
  return Math.ceil(totalMinutes / interval) * interval;
}

function getCurrentMinutes(now = new Date()) {
  return (now.getHours() * 60) + now.getMinutes();
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function fieldClassName() {
  return 'w-full rounded-2xl border border-brand-charcoal/10 bg-surface-container-high px-4 py-3.5 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20';
}

function initialFormState(user) {
  return {
    customer_name: user?.name || '',
    customer_email: user?.email || '',
    customer_phone: user?.phone || '',
    pickup_time: '',
    location_id: '',
    notes: '',
  };
}

export default function Checkout() {
  const { user } = useUser();
  const { items, subtotal, tax, fees, total, removeItem, updateQty, clearCart, getLinePrice, totalItems } = useCart();
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(() => initialFormState(user));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pickupMode, setPickupMode] = useState('immediate');
  const [pickupSlot, setPickupSlot] = useState('');
  const [paymentConfig, setPaymentConfig] = useState({ squareConfigured: false, squareEnvironment: 'sandbox', loading: true });

  useEffect(() => {
    fetchLocations()
      .then((response) => {
        setLocations(response.data);
        const firstOpenLocation = response.data.find((location) => location.status === 'open');
        if (firstOpenLocation) {
          setForm((current) => ({
            ...current,
            location_id: current.location_id || String(firstOpenLocation.id),
          }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPaymentConfig()
      .then((response) => {
        setPaymentConfig({
          squareConfigured: Boolean(response.data.squareConfigured),
          squareEnvironment: response.data.squareEnvironment || 'sandbox',
          loading: false,
        });
      })
      .catch(() => {
        setPaymentConfig((current) => ({ ...current, loading: false }));
      });
  }, []);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      customer_name: current.customer_name || user?.name || '',
      customer_email: current.customer_email || user?.email || '',
      customer_phone: current.customer_phone || user?.phone || '',
    }));
  }, [user]);

  const selectedLocation = useMemo(
    () => locations.find((location) => String(location.id) === String(form.location_id)) || null,
    [locations, form.location_id]
  );
  const locationHours = useMemo(
    () => getLocationHoursForToday(selectedLocation),
    [selectedLocation]
  );
  const pickupScheduling = useMemo(() => {
    if (!locationHours) {
      return {
        immediateAvailable: true,
        slots: [],
        acceptsPickupRequests: true,
      };
    }

    const now = new Date();
    const currentMinutes = getCurrentMinutes(now);
    const immediateAvailable = currentMinutes >= locationHours.openMinutes && currentMinutes <= locationHours.closeMinutes;
    const earliestLaterMinutes = roundUpToInterval(currentMinutes + PICKUP_SLOT_INTERVAL_MINUTES, PICKUP_SLOT_INTERVAL_MINUTES);
    const firstSlotMinutes = Math.max(locationHours.openMinutes, earliestLaterMinutes);
    const slots = [];

    for (let minutes = firstSlotMinutes; minutes <= locationHours.closeMinutes; minutes += PICKUP_SLOT_INTERVAL_MINUTES) {
      slots.push({
        value: formatMinutesAsLabel(minutes),
        label: formatMinutesAsLabel(minutes),
      });
    }

    return {
      immediateAvailable,
      slots,
      acceptsPickupRequests: immediateAvailable || slots.length > 0,
    };
  }, [locationHours]);

  useEffect(() => {
    if (pickupMode === 'immediate') {
      setForm((current) => ({
        ...current,
        pickup_time: 'ASAP',
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      pickup_time: pickupSlot,
    }));
  }, [pickupMode, pickupSlot]);

  useEffect(() => {
    if (!pickupScheduling.immediateAvailable && pickupMode === 'immediate') {
      if (pickupScheduling.slots.length > 0) {
        setPickupMode('later');
        setPickupSlot((current) => current || pickupScheduling.slots[0].value);
      }
      return;
    }

    if (pickupScheduling.slots.length > 0) {
      const slotStillValid = pickupScheduling.slots.some((slot) => slot.value === pickupSlot);
      if (!slotStillValid) {
        setPickupSlot(pickupScheduling.slots[0].value);
      }
    } else if (pickupMode === 'later') {
      setPickupSlot('');
    }
  }, [pickupScheduling, pickupMode, pickupSlot]);

  const pickupUnavailableMessage = useMemo(() => {
    if (pickupScheduling.acceptsPickupRequests) return '';
    if (!selectedLocation) return 'Pickup is not available right now.';
    return `${selectedLocation.name} is no longer accepting pickup requests for today. Please choose another location or try again tomorrow.`;
  }, [pickupScheduling.acceptsPickupRequests, selectedLocation]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (items.length === 0) {
      setError('Add at least one pickup item before checking out.');
      return;
    }

    if (pickupMode === 'later' && !pickupSlot) {
      setError('Choose a pickup time from the available later options.');
      return;
    }

    if (!pickupScheduling.acceptsPickupRequests) {
      setError(pickupUnavailableMessage || 'Pickup is not available right now.');
      return;
    }

    if (!paymentConfig.squareConfigured) {
      setError('Online payment is required for pickup orders, but Square checkout is not configured yet.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await submitOrder({
        ...form,
        order_type: 'pickup',
        payment_method: 'online',
        location_id: Number(form.location_id),
        items: items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          addons: (item.addons || []).map((addon) => ({
            id: addon.id,
            quantity: addon.quantity || 1,
          })),
        })),
      });

      const checkout = await createSquareCheckout({
        order_id: response.data.id,
        public_view_token: response.data.public_view_token,
      });

      if (!checkout.data.checkoutUrl) {
        throw new Error('Square checkout did not return a payment link.');
      }

      clearCart();
      window.location.assign(checkout.data.checkoutUrl);
    } catch (err) {
      setError(err.message || 'Could not place the pickup order right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-[linear-gradient(180deg,_#fbfaf7_0%,_#f3eee6_100%)]">
      <div className="max-w-7xl mx-auto px-8 py-16 lg:py-24">
        <Reveal>
          <div className="max-w-3xl">
            <p className="font-label uppercase tracking-[0.24em] text-xs font-bold text-primary mb-4">Pickup Checkout</p>
            <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-on-surface mb-6">
              BUILD
              <br />
              <span className="inline-block text-primary">PICKUP</span>
            </h1>
            <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
              Send the order to the store, pay securely through Square online checkout, and let the team confirm the pickup time. Delivery still finishes on DoorDash.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-8 mt-14">
          <section className="space-y-6">
            <Reveal>
              <div className="bg-white rounded-[32px] border border-brand-charcoal/10 shadow-editorial p-8">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2">Pickup Cart</p>
                    <h2 className="font-headline font-black text-3xl tracking-tight">{totalItems} item{totalItems === 1 ? '' : 's'} ready</h2>
                  </div>
                  <Link
                    to="/menu"
                    className="rounded-full bg-surface-container-high px-4 py-2 text-xs uppercase tracking-widest font-bold"
                  >
                    Edit Menu
                  </Link>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-3xl bg-surface-container-low px-6 py-10 text-center">
                    <span className="material-symbols-outlined text-5xl text-outline-variant">shopping_cart</span>
                    <h3 className="font-headline font-black text-2xl mt-4">Your pickup cart is empty</h3>
                    <p className="text-on-surface-variant mt-2">Add drinks from the menu, customize them with add-ons, and come back here to send the request to the store.</p>
                    <Link
                      to="/menu"
                      className="inline-flex mt-6 kinetic-gradient text-white font-label font-bold px-6 py-4 rounded-2xl uppercase tracking-[0.18em] text-sm"
                    >
                      Browse Menu
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.key} className="rounded-3xl bg-surface-container-low px-5 py-5">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-headline font-black text-2xl tracking-tight">{item.name}</h3>
                                <p className="text-sm text-on-surface-variant mt-1">
                                  {item.addons?.length
                                    ? item.addons.map((addon) => addon.name).join(', ')
                                    : 'No add-ons'}
                                </p>
                              </div>
                              <span className="text-primary font-headline font-black text-2xl">
                                {formatMoney(getLinePrice(item) * item.quantity)}
                              </span>
                            </div>

                            {item.addons?.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {item.addons.map((addon) => (
                                  <span
                                    key={`${item.key}-${addon.id}`}
                                    className="rounded-full bg-white px-3 py-1 text-xs uppercase tracking-widest font-bold text-on-surface-variant"
                                  >
                                    {addon.name} · {formatMoney(addon.price)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => updateQty(item.key, item.quantity - 1)}
                              className="w-10 h-10 rounded-full bg-white text-on-surface"
                            >
                              −
                            </button>
                            <span className="w-8 text-center font-bold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.key, item.quantity + 1)}
                              className="w-10 h-10 rounded-full bg-white text-on-surface"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(item.key)}
                              className="ml-2 rounded-full bg-rose-50 px-3 py-2 text-xs uppercase tracking-widest font-bold text-rose-700"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>

            <Reveal delay={90}>
              <div className="bg-brand-charcoal text-white rounded-[32px] px-8 py-8 md:px-10 md:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <p className="font-label uppercase tracking-widest text-[10px] font-bold text-white/60 mb-2">Need delivery?</p>
                  <h2 className="font-headline font-black text-3xl tracking-tighter mb-2">DoorDash still handles delivery checkout.</h2>
                  <p className="text-white/70 max-w-2xl">
                    Pickup now runs through the Java Drip Coffee website. Delivery remains a DoorDash handoff so dispatch and driver logistics stay streamlined.
                  </p>
                </div>
                <a
                  href={DOORDASH_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 bg-[#FF3008] text-white font-label font-bold px-6 py-4 rounded-2xl uppercase tracking-[0.18em] text-xs text-center"
                >
                  Order Delivery
                </a>
              </div>
            </Reveal>
          </section>

          <section>
            <Reveal>
              <form onSubmit={handleSubmit} className="bg-white rounded-[32px] border border-brand-charcoal/10 shadow-editorial p-8 space-y-6">
                <div>
                  <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2">Customer Details</p>
                  <h2 className="font-headline font-black text-3xl tracking-tight">Send Pickup Request</h2>
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2 block">Name</span>
                    <input
                      value={form.customer_name}
                      onChange={(event) => setForm((current) => ({ ...current, customer_name: event.target.value }))}
                      placeholder="Full name"
                      maxLength={120}
                      autoComplete="name"
                      className={fieldClassName()}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2 block">Email</span>
                    <input
                      type="email"
                      value={form.customer_email}
                      onChange={(event) => setForm((current) => ({ ...current, customer_email: event.target.value }))}
                      placeholder="Email address"
                      maxLength={160}
                      autoComplete="email"
                      className={fieldClassName()}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2 block">Phone</span>
                    <input
                      value={form.customer_phone}
                      onChange={(event) => setForm((current) => ({ ...current, customer_phone: event.target.value }))}
                      placeholder="Phone number"
                      maxLength={40}
                      autoComplete="tel"
                      className={fieldClassName()}
                    />
                  </label>
                  <div className="rounded-2xl bg-surface-container-low px-4 py-3">
                    <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-3">
                      Pickup Timing
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {pickupScheduling.immediateAvailable && (
                        <button
                          type="button"
                          onClick={() => setPickupMode('immediate')}
                          className={`rounded-full px-4 py-2 text-xs font-label font-bold uppercase tracking-widest transition-all ${
                            pickupMode === 'immediate'
                              ? 'kinetic-gradient text-white'
                              : 'bg-white text-on-surface'
                          }`}
                        >
                          Pickup ASAP
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPickupMode('later')}
                        className={`rounded-full px-4 py-2 text-xs font-label font-bold uppercase tracking-widest transition-all ${
                          pickupMode === 'later'
                            ? 'kinetic-gradient text-white'
                            : 'bg-white text-on-surface'
                        }`}
                      >
                        Pickup Later
                      </button>
                    </div>

                    {pickupMode === 'later' ? (
                      pickupScheduling.slots.length > 0 ? (
                        <select
                          value={pickupSlot}
                          onChange={(event) => setPickupSlot(event.target.value)}
                          className={fieldClassName()}
                          required
                        >
                          {pickupScheduling.slots.map((slot) => (
                            <option key={slot.value} value={slot.value}>
                              {slot.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm text-amber-700">
                          No later pickup slots are currently available for today.
                        </p>
                      )
                    ) : (
                      <p className="text-sm text-on-surface-variant">
                        The store will prepare your order as soon as possible after it is confirmed.
                      </p>
                    )}
                    {!pickupScheduling.acceptsPickupRequests && (
                      <p className="mt-3 text-sm text-rose-700">
                        {pickupUnavailableMessage}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2 block">Pickup Location</span>
                    <select
                      value={form.location_id}
                      onChange={(event) => setForm((current) => ({ ...current, location_id: event.target.value }))}
                      className={fieldClassName()}
                      required
                    >
                      <option value="">Choose pickup location</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-2xl bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary mt-0.5">storefront</span>
                    {selectedLocation ? (
                      <div>
                        <p className="font-bold text-on-surface">{selectedLocation.address}</p>
                        <p>{selectedLocation.city}</p>
                        <p className="mt-1">Today’s hours: {locationHours?.label || selectedLocation.hours_weekday || 'Call store'}</p>
                      </div>
                    ) : (
                      'Select a pickup location to preview store details.'
                    )}
                  </div>
                </div>

                <label className="block">
                  <span className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2 block">Special Instructions</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Special instructions for the store"
                    maxLength={500}
                    rows={4}
                    className="w-full rounded-2xl border border-brand-charcoal/10 bg-surface-container-high px-4 py-3.5 resize-none text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <div className="rounded-3xl bg-surface-container-low px-5 py-5">
                  <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-3">Online Payment</p>
                  <div className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    paymentConfig.squareConfigured
                      ? 'border-primary bg-primary/8 shadow-sm'
                      : 'border-brand-charcoal/10 bg-white opacity-70'
                  }`}>
                    <span className="block font-headline font-black text-lg">Pay online with Square</span>
                    <span className="mt-1 block text-sm text-on-surface-variant">
                      {paymentConfig.squareConfigured
                        ? 'You will be sent to Square secure checkout, then returned to this order.'
                        : 'Square checkout is not configured yet. Pickup orders require online payment before they can be sent.'}
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl bg-[#faf8f2] px-5 py-5 space-y-3">
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Subtotal</span>
                    <span>{formatMoney(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Estimated tax</span>
                    <span>{formatMoney(tax)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Estimated fees</span>
                    <span>{formatMoney(fees)}</span>
                  </div>
                  <div className="flex justify-between font-headline font-black text-2xl pt-2">
                    <span>Estimated total</span>
                    <span className="text-primary">{formatMoney(total)}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    After payment is complete, the store will review the paid order and confirm pickup timing by email.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || items.length === 0 || !pickupScheduling.acceptsPickupRequests || paymentConfig.loading || !paymentConfig.squareConfigured}
                  className="w-full kinetic-gradient text-white font-label font-bold py-4 rounded-2xl uppercase tracking-[0.18em] text-sm disabled:opacity-60"
                >
                  {submitting ? 'Starting Square checkout...' : 'Continue To Square Checkout'}
                </button>
              </form>
            </Reveal>
          </section>
        </div>
      </div>
    </div>
  );
}
