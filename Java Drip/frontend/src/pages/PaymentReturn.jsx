import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchOrder } from '../api';

const POLL_INTERVAL_MS = 2500;
const REDIRECT_DELAY_SECONDS = 3;

function isWebhookConfirmed(order) {
  return order?.payment_status === 'paid' || (
    order?.payment_method === 'online' &&
    order?.status &&
    order.status !== 'pending_payment'
  );
}

export default function PaymentReturn() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const token = useMemo(() => new URLSearchParams(location.search).get('token') || '', [location.search]);
  const finalOrderPath = `/order/${encodeURIComponent(id)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState(null);

  useEffect(() => {
    let canceled = false;

    const pollOrder = () => {
      fetchOrder(id, token)
        .then((response) => {
          if (canceled) return;
          setOrder(response.data);
          setError('');
          setPollCount((current) => current + 1);

          if (isWebhookConfirmed(response.data)) {
            setRedirectCountdown((current) => current ?? REDIRECT_DELAY_SECONDS);
          }
        })
        .catch(() => {
          if (!canceled) {
            setError('We are having trouble checking your payment status, but your Square receipt is still valid.');
          }
        });
    };

    pollOrder();
    const intervalId = window.setInterval(pollOrder, POLL_INTERVAL_MS);

    return () => {
      canceled = true;
      window.clearInterval(intervalId);
    };
  }, [id, token]);

  useEffect(() => {
    if (redirectCountdown === null) return undefined;

    if (redirectCountdown <= 0) {
      navigate(finalOrderPath, { replace: true });
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setRedirectCountdown((current) => (current === null ? null : current - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [finalOrderPath, navigate, redirectCountdown]);

  const webhookConfirmed = isWebhookConfirmed(order);
  const hasWaited = pollCount >= 12;

  return (
    <div className="pt-20 min-h-screen bg-[linear-gradient(180deg,_#fbfaf7_0%,_#f3eee6_100%)]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center px-6 py-16">
        <section className="w-full rounded-[36px] border border-brand-charcoal/10 bg-white p-8 text-center shadow-editorial sm:p-12">
          <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
            webhookConfirmed ? 'bg-emerald-100' : 'bg-primary/10'
          }`}>
            <span className={`material-symbols-outlined text-4xl ${
              webhookConfirmed ? 'text-emerald-700' : 'text-primary animate-spin'
            }`}>
              {webhookConfirmed ? 'check_circle' : 'sync'}
            </span>
          </div>

          <p className="font-label text-xs font-bold uppercase tracking-widest text-primary">
            Square Payment Complete
          </p>
          <h1 className="mt-3 font-headline text-4xl font-black tracking-tight text-on-surface sm:text-5xl">
            {webhookConfirmed ? 'Payment confirmed.' : 'Confirming your payment.'}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-on-surface-variant">
            {webhookConfirmed
              ? `We received Square's payment confirmation for order ${id}. Taking you to your order page now.`
              : `Your Square payment was placed. We are waiting for Square to finish updating order ${id} on our side before showing the final confirmation.`}
          </p>

          <div className="mt-8 rounded-[28px] bg-surface-container-low p-5 text-left">
            <div className="flex items-center justify-between gap-4">
              <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Website status
              </span>
              <span className={`rounded-full px-3 py-1 font-label text-[10px] font-bold uppercase tracking-widest ${
                webhookConfirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {webhookConfirmed ? 'Webhook received' : 'Waiting for webhook'}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  webhookConfirmed ? 'w-full bg-emerald-500' : 'w-2/3 kinetic-gradient'
                }`}
              />
            </div>
          </div>

          {redirectCountdown !== null && (
            <p className="mt-5 font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Redirecting in {Math.max(redirectCountdown, 0)}...
            </p>
          )}

          {error && (
            <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {error}
            </p>
          )}

          {hasWaited && !webhookConfirmed && (
            <div className="mt-6 rounded-2xl border border-brand-charcoal/10 bg-surface-container-low p-4 text-sm text-on-surface-variant">
              This is taking longer than usual. If you received a Square receipt, your payment was captured.
              You can keep this page open or check the order page manually.
            </div>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to={finalOrderPath}
              className="rounded-full bg-brand-charcoal px-6 py-3 font-label text-xs font-bold uppercase tracking-widest text-white"
            >
              View Order Page
            </Link>
            <Link
              to="/menu"
              className="rounded-full border border-brand-charcoal/10 bg-white px-6 py-3 font-label text-xs font-bold uppercase tracking-widest text-on-surface"
            >
              Back To Menu
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
