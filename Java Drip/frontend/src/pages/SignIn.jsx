import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SignIn as ClerkSignIn, SignUp as ClerkSignUp } from '@clerk/react';
import Reveal from '../components/Reveal';
import { useUser } from '../context/UserContext';
import { useEmployee } from '../context/EmployeeContext';
import { fetchAdminAuthStatus } from '../api';
import { CLERK_ENABLED } from '../lib/clerkConfig';

const PERKS = [
  { icon: 'coffee', title: 'Save your favorites', desc: 'Keep your go-to drinks ready for faster repeat pickup orders.' },
  { icon: 'schedule', title: 'Order history', desc: 'Review confirmed pickup requests and reorder from your account.' },
  { icon: 'verified_user', title: 'Social sign-in', desc: 'Use Google, Facebook, or Apple once they are enabled in Clerk.' },
];

const CLERK_APPEARANCE = {
  elements: {
    rootBox: 'w-full',
    card: 'shadow-none border-0 bg-transparent',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    socialButtonsBlockButton: 'rounded-xl',
    formButtonPrimary: 'kinetic-gradient rounded-xl uppercase tracking-[0.18em] text-sm font-bold',
    footerActionLink: 'text-primary font-bold',
    formFieldInput: 'rounded-xl',
  },
};

export default function SignIn() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  const { signIn: signInStaff, isEmployeeSignedIn, loading: employeeLoading } = useEmployee();
  const mode = new URLSearchParams(location.search).get('mode');
  const accountType = new URLSearchParams(location.search).get('type') === 'staff' ? 'staff' : 'customer';
  const showSignUp = mode === 'sign-up';
  const [staffForm, setStaffForm] = useState({ email: '', password: '' });
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [authStatus, setAuthStatus] = useState({ loading: true, sessionConfigured: true, bootstrapConfigured: false });

  const isStaffMode = accountType === 'staff';

  useEffect(() => {
    if (!isStaffMode && isSignedIn) navigate('/', { replace: true });
  }, [isSignedIn, isStaffMode, navigate]);

  useEffect(() => {
    if (!employeeLoading && isEmployeeSignedIn) navigate('/admin', { replace: true });
  }, [employeeLoading, isEmployeeSignedIn, navigate]);

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

  const handleStaffChange = (event) => {
    setStaffForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleStaffSubmit = async (event) => {
    event.preventDefault();
    setStaffSubmitting(true);
    setStaffError('');

    try {
      await signInStaff(staffForm);
      navigate('/admin', { replace: true });
    } catch (error) {
      setStaffError(error.message || 'Could not sign in. Please check the staff credentials.');
    } finally {
      setStaffSubmitting(false);
    }
  };

  return (
    <div className="pt-20">
      <section className="min-h-[calc(100vh-80px)] bg-[radial-gradient(circle_at_top_left,_rgba(255,110,169,0.24),_transparent_28%),linear-gradient(180deg,_#fffafc_0%,_#f6f6f6_56%,_#efe7eb_100%)]">
        <div className="max-w-7xl mx-auto px-8 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <Reveal from="left" className="lg:col-span-6">
            <span className="font-label uppercase tracking-widest text-xs font-bold text-primary block mb-4">Java Drip Coffee Account</span>
            <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-on-surface mb-6">
              {isStaffMode ? 'STAFF' : showSignUp ? 'JOIN' : 'SIGN IN'}
              <br />
              <span className="text-transparent bg-clip-text kinetic-gradient">THE PULSE</span>
            </h1>
            <p className="text-lg text-on-surface-variant max-w-xl leading-relaxed mb-10">
              Choose customer access for pickup history and reorder tools, or staff access for the private menu and pickup order workspace.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PERKS.map((perk, index) => (
                <Reveal key={perk.title} delay={index * 90}>
                  <div className="bg-white/80 backdrop-blur-sm border border-white/70 rounded-xl p-5 shadow-editorial h-full">
                    <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-primary">{perk.icon}</span>
                    </div>
                    <h2 className="font-headline font-black text-lg tracking-tight mb-2">{perk.title}</h2>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{perk.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>

          <Reveal from="right" delay={100} className="lg:col-span-6">
            <div className="bg-white/88 backdrop-blur-xl border border-white/80 rounded-[28px] shadow-editorial overflow-hidden">
              <div className="px-8 py-7 border-b border-surface-container bg-white/70">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-label uppercase tracking-widest text-xs font-bold text-primary mb-2">
                      {isStaffMode ? 'Employee Access' : showSignUp ? 'Create Account' : 'Welcome Back'}
                    </p>
                    <h2 className="font-headline text-3xl font-black tracking-tighter">
                      {isStaffMode ? 'Staff Sign In' : showSignUp ? 'Start Your Account' : 'Access Your Profile'}
                    </h2>
                  </div>
                  <div className="flex rounded-full bg-surface-container-low p-1">
                    <Link
                      to="/signin"
                      className={`px-4 py-2 rounded-full text-xs font-label font-bold uppercase tracking-widest ${!isStaffMode && !showSignUp ? 'bg-white text-on-surface shadow-sm' : 'text-zinc-500'}`}
                    >
                      Customer
                    </Link>
                    <Link
                      to="/signin?type=staff"
                      className={`px-4 py-2 rounded-full text-xs font-label font-bold uppercase tracking-widest ${isStaffMode ? 'bg-white text-on-surface shadow-sm' : 'text-zinc-500'}`}
                    >
                      Staff
                    </Link>
                  </div>
                </div>
              </div>

              <div className="px-8 py-8">
                {isStaffMode ? (
                  <form onSubmit={handleStaffSubmit} className="space-y-5">
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

                    <div className="rounded-2xl bg-surface-container-low border border-surface-container px-5 py-4">
                      <p className="font-label uppercase tracking-widest text-[10px] font-bold text-on-surface-variant mb-1">Private staff access</p>
                      <p className="text-sm text-on-surface">
                        Staff accounts can manage menu items, pricing, photos, and pickup requests.
                      </p>
                    </div>

                    <div>
                      <label className="font-label uppercase text-[10px] font-black tracking-widest text-on-surface-variant block mb-2">
                        Staff Email
                      </label>
                      <input
                        name="email"
                        type="email"
                        value={staffForm.email}
                        onChange={handleStaffChange}
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
                        value={staffForm.password}
                        onChange={handleStaffChange}
                        placeholder="Password"
                        className="w-full bg-surface-container-high border-none focus:ring-0 rounded-xl py-4 px-4 font-body text-on-surface placeholder:text-outline"
                        required
                      />
                    </div>

                    {staffError && (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                        {staffError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={staffSubmitting}
                      className="w-full kinetic-gradient text-on-primary font-label font-bold py-5 rounded-xl uppercase tracking-[0.2em] text-sm hover:opacity-90 transition-all active:scale-[0.99] disabled:opacity-60"
                    >
                      {staffSubmitting ? 'Signing In...' : 'Open Admin Panel'}
                    </button>
                  </form>
                ) : CLERK_ENABLED ? (
                  showSignUp ? (
                    <ClerkSignUp
                      path="/signin"
                      routing="path"
                      forceRedirectUrl="/"
                      signInUrl="/signin"
                      appearance={CLERK_APPEARANCE}
                    />
                  ) : (
                    <ClerkSignIn
                      path="/signin"
                      routing="path"
                      forceRedirectUrl="/"
                      signUpUrl="/signin?mode=sign-up"
                      appearance={CLERK_APPEARANCE}
                    />
                  )
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-amber-900">
                    <p className="font-bold mb-2">Customer sign-in is temporarily unavailable.</p>
                    <p className="text-sm leading-relaxed">
                      Please check back shortly or continue browsing the menu and pickup experience as a guest in the meantime.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                  <Link to="/menu" className="text-primary font-label font-bold uppercase tracking-widest text-xs">
                    Back to Menu
                  </Link>
                  {!isStaffMode && (
                    <p className="text-on-surface-variant">
                      Need a new account? <Link to="/signin?mode=sign-up" className="text-primary font-bold">Create customer account</Link>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
