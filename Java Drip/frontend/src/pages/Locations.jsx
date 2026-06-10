import { useEffect, useState } from 'react';
import { fetchLocations } from '../api';
import LazyEmbed from '../components/LazyEmbed';

const STATUS_MAP = {
  open: { label: 'Open Now', dot: 'bg-green-500', text: 'text-green-700' },
  closed: { label: 'Closed', dot: 'bg-red-400', text: 'text-red-600' },
  coming_soon: { label: 'Coming Soon', dot: 'bg-primary animate-pulse', text: 'text-primary' },
};

// Google Maps static embed for 1307 E Historic Highway 66, Gallup NM
const MAPS_EMBED =
  'https://maps.google.com/maps?q=1307+E+Historic+Highway+66,+Gallup,+NM+87301&t=&z=15&ie=UTF8&iwloc=&output=embed';

const GOOGLE_MAPS_LINK =
  'https://www.google.com/maps/search/?api=1&query=1307+E+Historic+Highway+66+Gallup+NM+87301';

function getTodayCloseTime(location, now = new Date()) {
  if (!location) return null;

  const day = now.getDay();
  const hoursText = day === 0
    ? (location.hours_sunday || location.hours_weekend)
    : day === 6
      ? (location.hours_saturday || location.hours_weekend)
      : location.hours_weekday;
  const matches = String(hoursText || '').match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
  return matches[1] || location.close_time || null;
}

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations()
      .then(res => setLocations(res.data))
      .finally(() => setLoading(false));
  }, []);

  const loc = locations[0]; // single real location
  const status = loc ? (STATUS_MAP[loc.status] || STATUS_MAP.open) : null;
  const todayCloseTime = getTodayCloseTime(loc);

  return (
    <div className="pt-20">
      {/* ── Page Hero ── */}
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-12">
        <span className="font-label uppercase tracking-widest text-xs font-bold text-primary block mb-4">
          Find Us
        </span>
        <h1 className="font-headline text-6xl md:text-8xl font-black tracking-tighter text-on-surface mb-4 leading-[0.9]">
          OUR<br />LOCATION
        </h1>
        <p className="text-lg text-on-surface-variant max-w-xl leading-relaxed">
          Come see us on Historic Highway 66 in Gallup, NM. Pickup orders welcome — or order delivery straight to your door via DoorDash.
        </p>
      </section>

      {/* ── Main location card + map ── */}
      <section className="bg-surface-container-low py-20">
        <div className="max-w-7xl mx-auto px-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <span className="material-symbols-outlined text-4xl text-primary animate-spin">refresh</span>
            </div>
          ) : loc ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Info panel */}
              <div className="bg-surface-container-lowest p-10 rounded-xl shadow-editorial">
                <div className="flex items-center gap-3 mb-8">
                  <span className={`w-2.5 h-2.5 rounded-full ${status.dot}`} />
                  <span className={`font-label font-bold text-sm uppercase tracking-widest ${status.text}`}>
                    {status.label}
                  </span>
                  {todayCloseTime && (
                    <span className="text-on-surface-variant text-sm">· Closes {todayCloseTime}</span>
                  )}
                </div>

                <h2 className="font-headline font-black text-3xl tracking-tighter mb-2">{loc.name}</h2>

                {/* Address */}
                <div className="flex items-start gap-4 mt-6">
                  <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">location_on</span>
                  </div>
                  <div>
                    <p className="font-label text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mb-1">Address</p>
                    <p className="font-body text-on-surface font-medium">{loc.address}</p>
                    <p className="font-body text-on-surface font-medium">{loc.city}</p>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-4 mt-6">
                  <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">schedule</span>
                  </div>
                  <div>
                    <p className="font-label text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mb-1">Hours</p>
                    <p className="font-body text-on-surface">{loc.hours_weekday}</p>
                    <p className="font-body text-on-surface">{loc.hours_saturday || loc.hours_weekend}</p>
                    <p className="font-body text-on-surface">{loc.hours_sunday || loc.hours_weekend}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4 mt-6">
                  <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">call</span>
                  </div>
                  <div>
                    <p className="font-label text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mb-1">Phone</p>
                    <a href="tel:+15054882682" className="font-body text-on-surface hover:text-primary transition-colors">
                      (505) 488-2682
                    </a>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 mt-10">
                  <a
                    href={GOOGLE_MAPS_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center kinetic-gradient text-on-primary font-label font-bold text-xs uppercase tracking-widest py-4 rounded-lg hover:opacity-90 transition-all"
                  >
                    <span className="material-symbols-outlined align-middle mr-1 text-sm">directions</span>
                    Get Directions
                  </a>
                  <a
                    href="https://www.doordash.com/store/java-drip-coffee-1307-e-historic-highway-66-gallup-35017583/75317750/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-surface-container-high text-on-surface font-label font-bold text-xs uppercase tracking-widest py-4 rounded-lg hover:bg-surface-container-highest transition-all"
                  >
                    <span className="material-symbols-outlined align-middle mr-1 text-sm">local_shipping</span>
                    Order Delivery
                  </a>
                </div>
              </div>

              {/* Map embed */}
              <div className="rounded-xl overflow-hidden shadow-editorial h-[500px]">
                <LazyEmbed
                  title="Java Drip Coffee location map"
                  src={MAPS_EMBED}
                  height={500}
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-full w-full"
                  placeholder="Loading Java Drip Coffee map."
                />
              </div>
            </div>
          ) : (
            <p className="text-on-surface-variant text-center py-20">Location info unavailable.</p>
          )}
        </div>
      </section>

      {/* ── What to expect ── */}
      <section className="max-w-7xl mx-auto px-8 py-24">
        <h2 className="font-headline text-4xl font-black tracking-tighter mb-12">What to Expect</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: 'storefront',
              title: 'Walk-In & Pickup',
              desc: 'Order ahead online and pick up at the counter — fast, no waiting in line.',
            },
            {
              icon: 'local_shipping',
              title: 'DoorDash Delivery',
              desc: 'Prefer to stay in? We deliver across Gallup via DoorDash. Tap "Order Delivery" above.',
            },
            {
              icon: 'coffee',
              title: 'Fresh Daily',
              desc: 'Every drink made to order with quality ingredients. Open seven days a week.',
            },
          ].map(item => (
            <div key={item.title} className="bg-surface-container-lowest p-8 rounded-lg shadow-editorial">
              <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary">{item.icon}</span>
              </div>
              <h3 className="font-headline font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Route 66 banner ── */}
      <section className="bg-brand-charcoal py-16 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="font-label uppercase tracking-widest text-xs text-primary mb-2">Gallup, New Mexico</p>
            <h2 className="font-headline font-black text-3xl text-white tracking-tighter">On Historic Route 66</h2>
            <p className="text-white/70 mt-2 max-w-md">
              1307 E Historic Highway 66 — right on the iconic Route 66 corridor through Gallup.
              Easy to find, impossible to forget.
            </p>
          </div>
          <a
            href={GOOGLE_MAPS_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 kinetic-gradient text-on-primary font-label font-bold px-8 py-4 rounded-lg uppercase tracking-wider hover:opacity-90 transition-all"
          >
            Open in Maps
          </a>
        </div>
      </section>
    </div>
  );
}
