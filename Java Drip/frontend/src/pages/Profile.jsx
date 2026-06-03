import { Link, useNavigate } from 'react-router-dom';
import Reveal from '../components/Reveal';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';

function formatCurrency(value) {
  return `$${Number(value).toFixed(2)}`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMemberSince(value) {
  if (!value) return 'Just joined';
  return new Date(value).toLocaleDateString([], { month: 'long', year: 'numeric' });
}

function getPickupDisplayTime(order) {
  if (order.confirmation_pickup_time) return order.confirmation_pickup_time;
  if (order.pickup_time) return order.pickup_time;
  return 'Pending confirmation';
}

export default function Profile() {
  const { user, orders, syncError, isSignedIn, signOut } = useUser();
  const { addItem, clearCart } = useCart();
  const navigate = useNavigate();

  const orderAgain = (order) => {
    clearCart();

    order.items.forEach((item) => {
      addItem({
        id: item.item_id,
        name: item.item_name,
        price: Number(item.item_price),
        quantity: Number(item.quantity) || 1,
        addons: (item.addons || []).map((addon) => ({
          id: addon.id,
          name: addon.name,
          price: Number(addon.price) || 0,
          quantity: Number(addon.quantity) || 1,
        })),
      });
    });

    navigate('/checkout');
  };

  if (!isSignedIn) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center px-8">
        <div className="max-w-xl text-center bg-surface-container-lowest rounded-3xl shadow-editorial p-10">
          <span className="material-symbols-outlined text-5xl text-primary mb-4">person</span>
          <h1 className="font-headline text-4xl font-black tracking-tighter mb-4">Profile Access</h1>
          <p className="text-on-surface-variant mb-8">
            Sign in to view your saved details and previous orders.
          </p>
          <Link
            to="/signin"
            className="inline-flex kinetic-gradient text-on-primary font-label font-bold px-8 py-4 rounded-lg uppercase tracking-widest text-sm"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20">
      <section className="bg-[radial-gradient(circle_at_top_right,_rgba(255,110,169,0.18),_transparent_28%),linear-gradient(180deg,_#fffafc_0%,_#f6f6f6_60%,_#efe7eb_100%)] min-h-[calc(100vh-80px)]">
        <div className="max-w-7xl mx-auto px-8 py-16 lg:py-24">
          <Reveal>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
              <div>
                <span className="font-label uppercase tracking-widest text-xs font-bold text-primary block mb-3">Member Profile</span>
                <h1 className="font-headline text-5xl lg:text-7xl font-black tracking-tighter leading-[0.9]">
                  {user.name}
                </h1>
                <p className="text-on-surface-variant text-lg mt-4 max-w-2xl">
                  Welcome back. Your account details and recent pickup history are tied to your live Java Drip Coffee login now.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 self-start lg:self-auto">
                <Link
                  to="/menu"
                  className="bg-white/80 border border-surface-container text-on-surface font-label font-bold px-6 py-4 rounded-xl uppercase tracking-widest text-xs text-center"
                >
                  Start a New Order
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="bg-brand-charcoal text-white font-label font-bold px-6 py-4 rounded-xl uppercase tracking-widest text-xs"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <Reveal from="left" className="lg:col-span-4">
              <div className="bg-white/88 backdrop-blur-xl border border-white/70 rounded-[28px] shadow-editorial p-8 space-y-8">
                <div>
                  <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2">Contact</p>
                  <div className="space-y-3">
                    <p className="text-lg font-bold">{user.email}</p>
                    <p className="text-on-surface-variant">{user.phone}</p>
                  </div>
                </div>

                <div className="bg-surface-container-low rounded-2xl p-5">
                  <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2">Member Since</p>
                  <p className="font-headline font-black text-xl tracking-tight">{formatMemberSince(user.createdAt)}</p>
                </div>

                <div className="border border-surface-container rounded-2xl p-5 bg-white/60">
                  <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2">Usual Order</p>
                  <p className="font-bold">{user.favoriteOrder || 'No favorite saved yet'}</p>
                </div>
              </div>
            </Reveal>

            <Reveal from="right" delay={100} className="lg:col-span-8">
              <div className="bg-white/88 backdrop-blur-xl border border-white/70 rounded-[28px] shadow-editorial p-8">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
                  <div>
                    <p className="font-label uppercase tracking-widest text-[10px] font-bold text-primary mb-2">Past Orders</p>
                    <h2 className="font-headline text-3xl font-black tracking-tighter">Recent Pickup History</h2>
                  </div>
                  <p className="text-sm text-on-surface-variant">Signed-in account order history.</p>
                </div>

                <div className="space-y-5">
                  {syncError && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      {syncError}
                    </div>
                  )}
                  {orders.length === 0 ? (
                    <div className="border border-dashed border-surface-container rounded-3xl p-8 bg-surface-container-lowest text-center text-on-surface-variant">
                      No pickup orders have been linked to this account yet.
                    </div>
                  ) : orders.map((order, index) => (
                    <Reveal key={order.id} delay={index * 70}>
                      <div className="border border-surface-container rounded-3xl p-6 bg-surface-container-lowest">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                          <div>
                            <div className="flex items-center gap-3 mb-3">
                              <p className="font-headline font-black text-2xl tracking-tight">{order.id}</p>
                              <span className="bg-primary/10 text-primary font-label font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
                                {order.status}
                              </span>
                            </div>
                            <p className="text-on-surface-variant text-sm mb-4">
                              {formatDate(order.created_at)} • Pickup order
                            </p>
                            <div className="space-y-2 text-sm">
                              {order.items.map((item, itemIndex) => (
                                <div key={`${order.id}-${itemIndex}`} className="flex justify-between gap-4">
                                  <span>
                                    {item.item_name} <span className="text-on-surface-variant">× {item.quantity}</span>
                                  </span>
                                  <span className="font-bold">{formatCurrency(item.item_price * item.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="min-w-[190px] rounded-2xl bg-white border border-surface-container p-4">
                            <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-2">Total</p>
                            <p className="font-headline font-black text-2xl tracking-tight text-primary mb-2">
                              {formatCurrency(order.total)}
                            </p>
                            <p className="text-sm text-on-surface-variant">
                              Ready at {getPickupDisplayTime(order)}
                            </p>
                            <button
                              type="button"
                              onClick={() => orderAgain(order)}
                              disabled={!order.items.length}
                              className="mt-4 w-full rounded-xl kinetic-gradient px-4 py-3 font-label text-[11px] font-bold uppercase tracking-widest text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Order Again
                            </button>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
