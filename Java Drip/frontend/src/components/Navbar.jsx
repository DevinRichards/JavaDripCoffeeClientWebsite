import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useEmployee } from '../context/EmployeeContext';
import { useCart } from '../context/CartContext';

const NAV_LINKS = [
  { to: '/menu', label: 'Menu' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/locations', label: 'Locations' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];
const CLERK_ENABLED = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

function AccountMenu({
  user,
  employee,
  isCustomerSignedIn,
  isEmployeeSignedIn,
  signOutCustomer,
  signOutEmployee,
  mobile = false,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const displayName = user?.name || employee?.name || 'Account';
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className={`relative ${mobile ? 'py-2' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center gap-3 rounded-full border border-surface-container bg-white/85 text-brand-charcoal shadow-sm transition-all hover:border-primary/40 hover:shadow-editorial ${
          mobile ? 'w-full justify-between px-4 py-3' : 'px-3 py-2'
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-black text-white">
          {initial}
        </span>
        <span className="font-label text-xs font-bold uppercase tracking-widest">
          {mobile ? 'Profile' : displayName.split(' ')[0]}
        </span>
        <span className={`material-symbols-outlined text-lg transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className={`${mobile ? 'mt-3 w-full' : 'absolute right-0 mt-3 w-72'} z-50 overflow-hidden rounded-3xl border border-surface-container bg-white shadow-editorial`}
        >
          <div className="border-b border-surface-container bg-surface-container-low px-5 py-4">
            <p className="font-label text-[10px] font-bold uppercase tracking-widest text-primary">
              Signed In
            </p>
            <p className="mt-1 truncate font-headline text-lg font-black text-on-surface">
              {displayName}
            </p>
          </div>

          <div className="p-2">
            {isCustomerSignedIn && (
              <Link
                to="/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-primary">person</span>
                Customer Profile
              </Link>
            )}
            {isEmployeeSignedIn && (
              <Link
                to="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
                Admin Profile
              </Link>
            )}
          </div>

          <div className="border-t border-surface-container p-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                if (isCustomerSignedIn) void signOutCustomer();
                if (isEmployeeSignedIn) signOutEmployee();
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-primary">logout</span>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, isSignedIn: isCustomerSignedIn, signOut: signOutCustomer } = useUser();
  const { employee, isEmployeeSignedIn, signOut: signOutEmployee } = useEmployee();
  const { totalItems } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-editorial">
      <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
        {/* Logo */}
        <Link to="/" className="text-2xl font-black text-brand-charcoal tracking-tighter font-headline">
          Java Drip Coffee
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `font-label tracking-tight font-bold text-sm uppercase transition-colors duration-300 ${
                  isActive
                    ? 'text-primary border-b-2 border-primary pb-0.5'
                    : 'text-zinc-600 hover:text-primary'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-5">
          <Link
            to="/checkout"
            className="hidden md:inline-flex items-center gap-2 rounded-full bg-brand-charcoal px-4 py-2 text-white font-label font-bold text-xs uppercase tracking-widest"
          >
            Pickup Cart
            <span className="rounded-full bg-white/15 px-2 py-0.5 min-w-[26px] text-center">{totalItems}</span>
          </Link>

          <div className="hidden md:flex items-center gap-4">
            {isCustomerSignedIn || isEmployeeSignedIn ? (
              <AccountMenu
                user={user}
                employee={employee}
                isCustomerSignedIn={isCustomerSignedIn}
                isEmployeeSignedIn={isEmployeeSignedIn}
                signOutCustomer={signOutCustomer}
                signOutEmployee={signOutEmployee}
              />
            ) : CLERK_ENABLED ? (
              <>
                <Link
                  to="/signin"
                  className="font-label tracking-tight font-bold text-sm uppercase text-zinc-600 hover:text-primary transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signin?mode=sign-up"
                  className="rounded-full kinetic-gradient px-4 py-2 text-white font-label font-bold text-xs uppercase tracking-widest"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <Link
                to="/signin"
                className="rounded-full kinetic-gradient px-4 py-2 text-white font-label font-bold text-xs uppercase tracking-widest"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Hamburger (mobile only) */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="md:hidden flex items-center justify-center p-2 rounded-full hover:bg-zinc-100 transition-all active:scale-95"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            <span className="material-symbols-outlined text-brand-charcoal transition-transform duration-300" style={{ transform: mobileOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              {mobileOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden mobile-nav-enter bg-white/95 backdrop-blur-xl border-t border-zinc-100 px-8 py-6 flex flex-col gap-1">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `font-label font-bold text-base uppercase tracking-widest py-3 border-b border-zinc-100 transition-colors ${
                  isActive ? 'text-primary' : 'text-zinc-700 hover:text-primary'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <Link
            to="/checkout"
            className="font-label font-bold text-base uppercase tracking-widest py-3 text-zinc-700 hover:text-primary transition-colors"
          >
            Pickup Cart ({totalItems})
          </Link>
          {isCustomerSignedIn || isEmployeeSignedIn ? (
            <AccountMenu
              user={user}
              employee={employee}
              isCustomerSignedIn={isCustomerSignedIn}
              isEmployeeSignedIn={isEmployeeSignedIn}
              signOutCustomer={signOutCustomer}
              signOutEmployee={signOutEmployee}
              mobile
            />
          ) : CLERK_ENABLED ? (
            <>
              <Link
                to="/signin"
                className="font-label font-bold text-base uppercase tracking-widest py-3 text-zinc-700 hover:text-primary transition-colors mt-1"
              >
                Sign In
              </Link>
              <Link
                to="/signin?mode=sign-up"
                className="font-label font-bold text-base uppercase tracking-widest py-3 text-zinc-700 hover:text-primary transition-colors"
              >
                Sign Up
              </Link>
            </>
          ) : (
            <Link
              to="/signin"
              className="font-label font-bold text-base uppercase tracking-widest py-3 text-zinc-700 hover:text-primary transition-colors mt-1"
            >
              Sign In
            </Link>
          )}
          {!isEmployeeSignedIn && (
            <Link
              to="/admin/signin"
              className="font-label font-bold text-base uppercase tracking-widest py-3 text-zinc-700 hover:text-primary transition-colors"
            >
              Staff Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
