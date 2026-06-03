import { Link } from 'react-router-dom';
import { FACEBOOK_URL, INSTAGRAM_URL, TIKTOK_URL } from '../content/socialMedia';

export default function Footer() {
  return (
    <footer className="w-full py-12 px-8 bg-zinc-50">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 max-w-7xl mx-auto">
        <Link to="/" className="font-headline font-black text-xl text-brand-charcoal uppercase tracking-tighter">
          Java Drip Coffee
        </Link>
        <div className="flex flex-wrap justify-center gap-8">
          {[
            { to: '/about', label: 'About' },
            { to: '/menu', label: 'Menu' },
            { to: '/gallery', label: 'Gallery' },
            { to: '/locations', label: 'Locations' },
            { to: '/contact', label: 'Contact Us' },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="font-body text-sm text-zinc-500 hover:text-brand-charcoal hover:underline transition-all"
            >
              {label}
            </Link>
          ))}
          <Link to="/privacy" className="font-body text-sm text-zinc-500 hover:text-brand-charcoal hover:underline transition-all">
            Privacy Policy
          </Link>
          <Link to="/terms" className="font-body text-sm text-zinc-500 hover:text-brand-charcoal hover:underline transition-all">
            Terms of Service
          </Link>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-sm text-zinc-500 hover:text-brand-charcoal hover:underline transition-all"
          >
            Instagram
          </a>
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-sm text-zinc-500 hover:text-brand-charcoal hover:underline transition-all"
          >
            Facebook
          </a>
          <a
            href={TIKTOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-sm text-zinc-500 hover:text-brand-charcoal hover:underline transition-all"
          >
            TikTok
          </a>
          <Link to="/admin/signin" className="font-body text-sm text-zinc-500 hover:text-brand-charcoal hover:underline transition-all">
            Staff Login
          </Link>
        </div>
        <div className="font-body text-sm text-zinc-500">
          © {new Date().getFullYear()} Java Drip Coffee. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
