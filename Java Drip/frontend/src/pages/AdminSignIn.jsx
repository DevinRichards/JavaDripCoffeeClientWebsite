import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Reveal from '../components/Reveal';
import { useEmployee } from '../context/EmployeeContext';
import { fetchAdminAuthStatus } from '../api';

const ADMIN_FEATURES = [
  { icon: 'sell', title: 'Update prices fast', desc: 'Adjust pricing, badges, and availability in a few clicks.' },
  { icon: 'restaurant_menu', title: 'Add new drinks', desc: 'Create seasonal drops, snacks, and featured drinks without waiting on a dev push.' },
  { icon: 'inventory_2', title: 'Confirm pickup orders', desc: 'Review paid pickup orders, set the pickup time, and email customers when the order is ready.' },
];

export default function AdminSignIn() {
  const navigate = useNavigate();
  const { signIn, isEmployeeSignedIn, loading } = useEmployee();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [authStatus, setAuthStatus] = useState({ loading: true, sessionConfigured: true, bootstrapConfigured: false });

  useEffect(() => {
    if (!loading && isEmployeeSignedIn) {
      navigate('/admin', { replace: true });
    }
  }, [isEmployeeSignedIn, loading, navigate]);

  useEffect(() => {
    let cancelled = false;

    fetchAdminAuthStatus()
      .then((response) => {
        if (cancelled) return;
        setAuthStatus({
          loading: false,
          sessionConfigured: Boolean(response.data.sessionConfigured),
          bootstrapConfigured: Boolean(response.data.bootstrapConfigured),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setAuthStatus({
          loading: false,
          sessionConfigured: false,
          bootstrapConfigured: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await signIn(form);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not sign in. Please check the staff credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,110,169,0.18),_transparent_28%),linear-gradient(180deg,_#f8f7f4_0%,_#ece9e2_100%)]">
      <div className="max-w-7xl mx-auto px-8 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <Reveal from="left" className="lg:col-span-6">
          <span className="font-label uppercase tracking-widest text-xs font-bold text-primary block mb-4">Staff Control Room</span>
          <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-on-surface mb-6">
            MENU
            <br />
            <span className="text-transparent bg-clip-text kinetic-gradient">OPS</span>
          </h1>
          <p className="text-lg text-on-surface-variant max-w-xl leading-relaxed mb-10">
            This staff sign-in unlocks the internal menu editor so the team can update drinks, prices, and availability without waiting on a developer handoff.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ADMIN_FEATURES.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 90}>
                <div className="bg-white/85 backdrop-blur-sm border border-white/70 rounded-xl p-5 shadow-editorial h-full">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-primary">{feature.icon}</span>
                  </div>
                  <h2 className="font-headline font-black text-lg tracking-tight mb-2">{feature.title}</h2>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{feature.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        <Reveal from="right" delay={100} className="lg:col-span-6">
          <div className="bg-white/92 backdrop-blur-xl border border-white/80 rounded-[28px] shadow-editorial overflow-hidden">
            <div className="px-8 py-7 border-b border-surface-container bg-white/70">
              <p className="font-label uppercase tracking-widest text-xs font-bold text-primary mb-2">Employee Access</p>
              <h2 className="font-headline text-3xl font-black tracking-tighter">Sign In To Edit The Menu</h2>
            </div>

            <div className="px-8 py-8 space-y-6">
              <div className="rounded-2xl bg-surface-container-low border border-surface-container px-5 py-4">
                <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-1">Private staff access</p>
                <p className="text-sm text-on-surface">
                  This area is reserved for the Java Drip Coffee team to manage menu items, pricing, and pickup requests.
                </p>
              </div>

              {!authStatus.loading && !authStatus.sessionConfigured && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                  Staff sign-in is temporarily unavailable. Please contact the site administrator to restore access.
                </div>
              )}

              {!authStatus.loading && authStatus.sessionConfigured && !authStatus.bootstrapConfigured && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
                  No staff account is available right now. Please contact the site administrator for access.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="font-label uppercase text-[10px] font-black tracking-widest text-on-surface-variant block mb-2">
                    Staff Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="admin@javadrip.coffee"
                    className="w-full bg-surface-container-high border-none focus:ring-0 rounded-xl py-4 px-4 font-body text-on-surface placeholder:text-outline"
                    required
                  />
                </div>

                <div>
                  <label className="font-label uppercase text-[10px] font-black tracking-widest text-on-surface-variant block mb-2">
                    Password
                  </label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••••••"
                    className="w-full bg-surface-container-high border-none focus:ring-0 rounded-xl py-4 px-4 font-body text-on-surface placeholder:text-outline"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full kinetic-gradient text-on-primary font-label font-bold py-5 rounded-xl uppercase tracking-[0.2em] text-sm hover:opacity-90 transition-all active:scale-[0.99] disabled:opacity-60"
                >
                  {submitting ? 'Signing In…' : 'Open Admin Panel'}
                </button>
              </form>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600 mt-0.5">admin_panel_settings</span>
                  <div>
                    <p className="font-bold text-amber-800">Use a unique staff credential set before launch.</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Staff access should stay private and only be shared with the store team.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                <Link to="/menu" className="text-primary font-label font-bold uppercase tracking-widest text-xs">
                  Back to Menu
                </Link>
                <p className="text-on-surface-variant">
                  Customer login lives here: <Link to="/signin" className="text-primary font-bold">Customer sign-in</Link>
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
