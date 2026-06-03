import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { fetchOrder } from '../api';
import { useUser } from '../context/UserContext';

export default function OrderConfirmation() {
  const { id } = useParams();
  const location = useLocation();
  const { state } = location;
  const { addOrder, isSignedIn } = useUser();
  const token = new URLSearchParams(location.search).get('token') || state?.order?.public_view_token || '';
  const [order, setOrder] = useState(state?.order || null);
  const [loading, setLoading] = useState(!state?.order);

  useEffect(() => {
    if (!order) {
      fetchOrder(id, token)
        .then(res => setOrder(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id, order, token]);

  useEffect(() => {
    if (order && isSignedIn) addOrder(order);
  }, [order, isSignedIn, addOrder]);

  if (loading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined text-5xl text-primary animate-spin">refresh</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="pt-20 min-h-screen flex flex-col items-center justify-center gap-4">
        <h2 className="font-headline font-black text-3xl">Order not found</h2>
        <Link to="/" className="text-primary underline">Back to home</Link>
      </div>
    );
  }

  const confirmedPickupTime = order.confirmation_pickup_time || order.pickup_time || null;
  const isPending = order.status === 'pending_confirmation';
  const isPendingPayment = order.status === 'pending_payment';
  const isCanceled = order.status === 'canceled';
  const statusLabel = isCanceled
    ? 'Pickup Order Canceled'
    : isPendingPayment
      ? 'Online Payment Pending'
      : isPending
      ? 'Pickup Request Received'
      : 'Pickup Order Confirmed';

  return (
    <div className="pt-20 min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-8 py-20">
        {/* Success header */}
        <div className="text-center mb-12">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isCanceled ? 'bg-rose-100' : isPending ? 'bg-amber-100' : 'bg-green-100'}`}>
            <span className={`material-symbols-outlined text-4xl ${isCanceled ? 'text-rose-700' : isPending ? 'text-amber-700' : 'text-green-600'}`}>
              {isCanceled ? 'cancel' : isPending ? 'schedule' : 'check_circle'}
            </span>
          </div>
          <span className="font-label uppercase tracking-widest text-xs font-bold text-primary block mb-2">
            {statusLabel}
          </span>
          <h1 className="font-headline text-4xl font-black tracking-tighter">
            {isCanceled
              ? 'Your pickup request has been canceled.'
              : isPendingPayment
                ? 'Your order is waiting for online payment.'
              : isPending
                ? 'Your order is waiting for store confirmation.'
                : 'Your order is confirmed.'}
          </h1>
          <p className="text-on-surface-variant mt-3 text-lg">
            Thanks, <strong>{order.customer_name}</strong>! {isCanceled
              ? 'Please contact the store if you have questions.'
              : isPendingPayment
                ? 'Complete Square checkout so the team can review and confirm your pickup time.'
              : isPending
                ? 'The team will review it and email you with a pickup time.'
                : 'The team has confirmed your pickup timing.'}
          </p>
        </div>

        {/* Order details card */}
        <div className="bg-surface-container-lowest rounded-xl shadow-editorial overflow-hidden mb-8">
          {/* Order ID header */}
          <div className="kinetic-gradient px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-label uppercase text-[10px] tracking-widest text-white/70 mb-1">Order ID</p>
                <p className="font-headline font-black text-2xl text-white tracking-tighter">{order.id}</p>
              </div>
              <div className="text-right">
                <p className="font-label uppercase text-[10px] tracking-widest text-white/70 mb-1">Status</p>
                <span className="bg-white/20 text-white font-label font-bold text-xs uppercase tracking-widest px-3 py-1 rounded-full">
                  {order.status}
                </span>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">
            {/* Pickup info */}
            {order.order_type === 'pickup' && (
              <div className={`flex items-start gap-4 rounded-lg p-4 ${isCanceled ? 'bg-rose-50' : isPending ? 'bg-amber-50' : 'bg-secondary-container/30'}`}>
                <span className={`material-symbols-outlined mt-0.5 ${isCanceled ? 'text-rose-700' : isPending ? 'text-amber-700' : 'text-primary'}`}>{isCanceled ? 'cancel' : 'storefront'}</span>
                <div>
                  <p className="font-bold text-sm">
                    {isCanceled
                      ? 'This pickup request was canceled by the store'
                      : isPendingPayment
                      ? 'Online payment is still pending'
                      : confirmedPickupTime
                      ? `Pickup ${isPending ? 'requested' : 'confirmed'} for ${confirmedPickupTime}`
                      : 'Pickup time pending store confirmation'}
                  </p>
                  <p className="text-on-surface-variant text-sm">
                    {isCanceled
                      ? (order.admin_notes || 'Please contact the store directly if you need help with this order.')
                      : isPendingPayment
                      ? 'If you already paid, this page will update after Square sends payment confirmation.'
                      : isPending
                      ? 'Watch your email for the confirmed pickup time before heading over.'
                      : order.payment_status === 'paid'
                      ? 'Please present this order ID when you arrive. Payment has already been received.'
                      : 'Please contact the store if this order was not completed through online payment.'}
                  </p>
                </div>
              </div>
            )}

            {/* Items */}
            <div>
              <h3 className="font-headline font-bold mb-4">Items Ordered</h3>
              <div className="space-y-3">
                {(order.items || []).map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="text-on-surface">
                      {item.item_name || item.name}
                    <span className="text-on-surface-variant ml-2">× {item.quantity}</span>
                    {item.addons?.length > 0 && (
                      <span className="block text-xs mt-1">
                        Add-ons: {item.addons.map((addon) => addon.name).join(', ')}
                      </span>
                    )}
                  </span>
                    <span className="font-bold">${(((item.item_price || item.price) + (item.addons?.reduce((sum, addon) => sum + Number(addon.price || 0), 0) || 0)) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-surface-container pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-on-surface-variant">
                <span>Subtotal</span>
                <span>${Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Tax</span>
                <span>${Number(order.tax).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Estimated fees</span>
                <span>${Number(order.fees || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-headline font-black text-lg pt-2">
                <span>Total</span>
                <span className="text-primary">${Number(order.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Payment</span>
                <span>
                  {order.payment_method === 'online'
                    ? order.payment_status === 'paid'
                      ? 'Paid online'
                      : 'Square payment pending'
                    : 'Payment not completed online'}
                </span>
              </div>
            </div>

            {/* Confirmation email note */}
            <div className="flex items-center gap-3 text-sm text-on-surface-variant bg-surface-container-low rounded p-4">
              <span className="material-symbols-outlined text-sm text-outline-variant">mail</span>
              <span>
                {isCanceled
                  ? 'A cancellation notice'
                  : isPending
                    ? 'A pickup request'
                    : 'A pickup confirmation'} has been emailed to <strong>{order.customer_email}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/menu"
            className="flex-1 text-center kinetic-gradient text-on-primary font-label font-bold py-4 rounded-lg uppercase tracking-widest text-sm hover:opacity-90 transition-all"
          >
            Order Again
          </Link>
          <Link
            to="/"
            className="flex-1 text-center bg-surface-container-high text-on-surface font-label font-bold py-4 rounded-lg uppercase tracking-widest text-sm hover:bg-surface-container-highest transition-all"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
