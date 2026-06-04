import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { fetchMenu } from '../api';
import Reveal from '../components/Reveal';
import { useCart } from '../context/CartContext';

const DOORDASH_URL = 'https://www.doordash.com/store/java-drip-coffee-1307-e-historic-highway-66-gallup-35017583/75317750/';
const ADDON_CATEGORY_IDS = new Set(['add-ons', 'milk-options']);
const ADDON_CATEGORY_NAMES = new Set(['add ons', 'milk options']);

function isAddonCategory(category) {
  return ADDON_CATEGORY_IDS.has(category.id) || ADDON_CATEGORY_NAMES.has(String(category.name || '').toLowerCase());
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getDisplayCategoryName(category) {
  return category.id === 'uncategorized' ? 'Other' : category.name;
}

function Badge({ text }) {
  return (
    <span className="px-2 py-1 text-[10px] font-black uppercase rounded font-label tracking-widest bg-primary text-white">
      {text}
    </span>
  );
}

function ItemCard({ item, onPickup, informational = false }) {
  return (
    <div className="bg-surface-container-lowest p-6 flex flex-col group relative hover:shadow-editorial transition-all">
      <div className="mb-6 overflow-hidden bg-surface-container aspect-square rounded">
        <div className="w-full h-full flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-outline-variant">coffee</span>
        </div>
        {item.badge && (
          <div className="absolute top-4 left-4">
            <Badge text={item.badge} />
          </div>
        )}
      </div>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-bold tracking-tight pr-2">{item.name}</h3>
        <span className="text-primary font-black text-xl flex-shrink-0">{formatMoney(item.price)}</span>
      </div>
      <p className="text-on-surface-variant text-sm mb-6 flex-grow leading-relaxed">
        {item.description || (informational ? 'Available as an add-on during pickup ordering.' : 'Freshly prepared at Java Drip Coffee.')}
      </p>
      {informational ? (
        <div className="rounded-md bg-surface-container-high px-4 py-3 text-sm text-on-surface-variant">
          Choose these during pickup item customization.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onPickup}
            className="bg-primary text-on-primary py-3 font-label font-bold uppercase tracking-widest text-xs rounded-md flex items-center justify-center gap-2 hover:bg-primary-dim transition-all active:scale-95"
          >
            Add For Pickup
          </button>
          <a
            href={DOORDASH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface-container-high text-on-surface py-3 font-label font-bold uppercase tracking-widest text-xs rounded-md flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-all active:scale-95"
          >
            Delivery
          </a>
        </div>
      )}
    </div>
  );
}

function PickupConfigurator({ item, addonCategories, onClose, onAdd }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState({});

  const selectedAddonItems = useMemo(
    () => addonCategories.flatMap((category) => category.items)
      .filter((addon) => selectedAddons[addon.id])
      .map((addon) => ({ ...addon, quantity: 1 })),
    [addonCategories, selectedAddons]
  );

  const previewTotal = useMemo(() => {
    const addonsTotal = selectedAddonItems.reduce((sum, addon) => sum + Number(addon.price), 0);
    return (Number(item.price) + addonsTotal) * quantity;
  }, [item.price, quantity, selectedAddonItems]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-brand-charcoal/65 backdrop-blur-sm" aria-label="Close pickup builder">
      <div
        className="flex min-h-full items-center justify-center p-4 sm:p-6"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] bg-white shadow-editorial sm:max-h-[calc(100vh-3rem)]"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-brand-charcoal/10 px-6 py-5">
            <div>
              <p className="mb-2 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Pickup Builder</p>
              <h2 className="font-headline text-3xl font-black tracking-tight">{item.name}</h2>
              <p className="mt-2 text-on-surface-variant">
                {item.description || 'Customize the drink, then add it to the pickup cart.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full bg-surface-container-high p-2 text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-container-low px-4 py-4">
                <div>
                  <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Base Price</p>
                  <p className="font-headline text-2xl font-black">{formatMoney(item.price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Qty</label>
                  <select
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                    className="rounded-xl border border-brand-charcoal/10 bg-white px-3 py-2"
                  >
                    {[1, 2, 3, 4, 5, 6].map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              {addonCategories.map((category) => (
                <section key={category.id}>
                  <h3 className="mb-3 font-headline text-xl font-black tracking-tight">{category.name}</h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {category.items.map((addon) => (
                      <label
                        key={addon.id}
                        className={`cursor-pointer rounded-2xl border px-4 py-4 transition-colors ${
                          selectedAddons[addon.id]
                            ? 'border-primary bg-primary/5'
                            : 'border-brand-charcoal/10 bg-surface-container-low'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedAddons[addon.id])}
                            onChange={(event) => setSelectedAddons((current) => ({
                              ...current,
                              [addon.id]: event.target.checked,
                            }))}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between gap-3">
                              <span className="font-bold">{addon.name}</span>
                              <span className="font-bold text-primary">{formatMoney(addon.price)}</span>
                            </div>
                            <p className="mt-1 text-sm text-on-surface-variant">
                              {addon.description || 'Add this to the drink when the store prepares the order.'}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              ))}

              <div className="flex items-center justify-between gap-4 rounded-2xl bg-brand-charcoal px-5 py-4 text-white">
                <div>
                  <p className="font-label text-[10px] font-bold uppercase tracking-widest text-white/60">Pickup Cart Preview</p>
                  <p className="mt-1 text-sm text-white/80">
                    {quantity} {quantity === 1 ? 'drink' : 'drinks'} with {selectedAddonItems.length} add-on{selectedAddonItems.length === 1 ? '' : 's'} selected
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-label text-[10px] font-bold uppercase tracking-widest text-white/60">Line Total</p>
                  <p className="font-headline text-2xl font-black">{formatMoney(previewTotal)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-brand-charcoal/10 bg-white px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  onAdd({
                    id: item.id,
                    name: item.name,
                    price: Number(item.price),
                    quantity,
                    addons: selectedAddonItems.map((addon) => ({
                      id: addon.id,
                      name: addon.name,
                      price: Number(addon.price),
                      quantity: 1,
                    })),
                  });
                  onClose();
                }}
                className="kinetic-gradient flex-1 rounded-2xl py-4 font-label text-sm font-bold uppercase tracking-[0.18em] text-white"
              >
                Add To Pickup Cart
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl bg-surface-container-high py-4 font-label text-sm font-bold uppercase tracking-[0.18em] text-on-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Menu() {
  const { addItem, totalItems } = useCart();
  const [menu, setMenu] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [configuringItem, setConfiguringItem] = useState(null);

  useEffect(() => {
    fetchMenu()
      .then((res) => {
        setMenu(res.data);
        const firstCustomerCategory = res.data.find((category) => !isAddonCategory(category));
        if (firstCustomerCategory) setActiveCategory(firstCustomerCategory.id);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const addonCategories = useMemo(
    () => menu.filter((category) => isAddonCategory(category)),
    [menu]
  );

  const customerCategories = useMemo(
    () => menu.filter((category) => !isAddonCategory(category)),
    [menu]
  );

  const scrollToCategory = (id) => {
    setActiveCategory(id);
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="pt-20">
      {configuringItem && (
        <PickupConfigurator
          item={configuringItem}
          addonCategories={addonCategories}
          onClose={() => setConfiguringItem(null)}
          onAdd={addItem}
        />
      )}

      <div className="px-6 sm:px-8 pt-16 pb-12 max-w-7xl mx-auto">
        <h1 className="hero-anim hero-anim-1 text-[4rem] sm:text-7xl md:text-9xl font-black tracking-tighter text-on-surface uppercase leading-[0.85] mb-4">
          The<br />Pulse<br /><span className="text-primary italic">Menu</span>
        </h1>
        <p className="hero-anim hero-anim-2 w-full max-w-[19rem] sm:max-w-2xl text-lg text-on-surface-variant font-medium leading-relaxed">
          Explore the Java Drip Coffee menu, build a pickup order, and check out securely online. Delivery orders continue through DoorDash.
        </p>
      </div>

      <div className="sticky top-16 z-30 bg-white/90 backdrop-blur-xl border-b border-surface-container">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex gap-6 overflow-x-auto no-scrollbar py-4">
            {customerCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={`font-label font-bold text-xs uppercase tracking-widest whitespace-nowrap pb-1 transition-all ${
                  activeCategory === cat.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-zinc-500 hover:text-on-surface'
                }`}
              >
                {getDisplayCategoryName(cat)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 pb-20">
        {loading && (
          <div className="flex justify-center py-20">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">refresh</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <span className="material-symbols-outlined text-5xl text-outline-variant">wifi_off</span>
            <h3 className="font-headline font-black text-xl">The menu is temporarily unavailable</h3>
            <p className="text-on-surface-variant text-sm max-w-sm">
              Please refresh the page in a moment. If the issue continues, contact Java Drip Coffee directly.
            </p>
          </div>
        )}

        {!loading && !error && customerCategories.map((cat, index) => (
          <section
            id={`cat-${cat.id}`}
            key={cat.id}
            className={`pt-20 pb-12 ${index % 2 !== 0 ? '-mx-8 px-8 bg-surface-container-low' : ''}`}
          >
            <div className={`${index % 2 !== 0 ? 'max-w-7xl mx-auto' : ''}`}>
              <Reveal>
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                  <div className="border-l-4 border-primary pl-6">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">{getDisplayCategoryName(cat)}</h2>
                    {cat.subtitle && (
                      <p className="text-sm font-label uppercase tracking-[0.2em] text-on-surface-variant mt-1">{cat.subtitle}</p>
                    )}
                  </div>
                </div>
              </Reveal>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {cat.items.map((item, itemIndex) => (
                  <Reveal key={item.id} delay={itemIndex * 80}>
                    <ItemCard item={item} onPickup={() => setConfiguringItem(item)} />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      <Reveal>
        <div className="bg-brand-charcoal py-16 px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <p className="font-label uppercase tracking-widest text-xs text-primary mb-2">Delivery</p>
              <h2 className="font-headline font-black text-3xl text-white tracking-tighter">Need it delivered instead?</h2>
              <p className="text-white/70 mt-2">Head to DoorDash to place a delivery order for Java Drip Coffee.</p>
            </div>
            <a
              href={DOORDASH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 bg-[#FF3008] text-white font-label font-bold px-8 py-4 rounded-lg uppercase tracking-wider hover:opacity-90 transition-all"
            >
              Order Delivery
            </a>
          </div>
        </div>
      </Reveal>

      <Link
        to="/checkout"
        className="fixed bottom-6 right-6 z-40 kinetic-gradient text-white rounded-full px-5 py-4 shadow-editorial font-label font-bold uppercase tracking-[0.18em] text-xs"
      >
        Pickup Cart ({totalItems})
      </Link>
    </div>
  );
}
