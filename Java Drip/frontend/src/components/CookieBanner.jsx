import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'jd_cookie_consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner only if user hasn't responded yet
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Slight delay so it doesn't flash on first paint
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-brand-charcoal/95 backdrop-blur-md border-t border-white/15 animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)_both]"
      style={{ animation: 'cookieSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4 flex-1">
          <span aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 rounded-full bg-primary" />
          <p className="min-w-0 max-w-[19rem] text-zinc-300 text-sm leading-relaxed sm:max-w-none">
            We use essential cookies to keep the site, sign-ins, and preferences working. We don't use advertising or tracking cookies.{' '}
            <Link to="/privacy" className="text-primary underline hover:text-primary-container transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={decline}
            className="px-5 py-2.5 text-zinc-400 font-label font-bold text-xs uppercase tracking-widest hover:text-white transition-colors border border-zinc-600 rounded-lg"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-5 py-2.5 kinetic-gradient text-white font-label font-bold text-xs uppercase tracking-widest rounded-lg hover:opacity-90 transition-all"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
