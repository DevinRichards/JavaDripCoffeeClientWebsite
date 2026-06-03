import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth, useClerk, useUser as useClerkUser } from '@clerk/react';
import { fetchCustomerSession } from '../api';

const UserContext = createContext(null);
const CLERK_ENABLED = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const STAFF_SIGNED_IN_EVENT = 'jd:staff-signed-in';
const CUSTOMER_SIGNED_IN_EVENT = 'jd:customer-signed-in';

function getClerkEmail(user) {
  return user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '';
}

function getClerkPhone(user) {
  return user?.primaryPhoneNumber?.phoneNumber || user?.phoneNumbers?.[0]?.phoneNumber || '';
}

function buildFallbackUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.fullName || user.firstName || 'Java Drip Coffee Member',
    email: getClerkEmail(user),
    phone: getClerkPhone(user),
    favoriteOrder: null,
    createdAt: user.createdAt || null,
  };
}

function ClerkUserProvider({ children }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useClerkUser();
  const clerk = useClerk();
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    const handleStaffSignedIn = () => {
      if (isSignedIn) {
        void clerk.signOut({ redirectUrl: '/admin' });
      }
    };

    window.addEventListener(STAFF_SIGNED_IN_EVENT, handleStaffSignedIn);
    return () => window.removeEventListener(STAFF_SIGNED_IN_EVENT, handleStaffSignedIn);
  }, [clerk, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setProfile(null);
      setOrders([]);
      setSyncing(false);
      setSyncError('');
      return;
    }

    window.dispatchEvent(new Event(CUSTOMER_SIGNED_IN_EVENT));

    let cancelled = false;
    setSyncing(true);

    getToken()
      .then((token) => {
        if (!token) {
          throw new Error('Missing Clerk session token.');
        }

        return fetchCustomerSession(token);
      })
      .then((response) => {
        if (cancelled) return;
        setProfile(response.data.user);
        setOrders(response.data.orders || []);
        setSyncError('');
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Customer session sync failed:', error.message);
        setProfile(buildFallbackUser(clerkUser));
        setSyncError('We could not refresh your account details right now. Your previous order history may be temporarily unavailable.');
      })
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, clerkUser]);

  const user = profile || buildFallbackUser(clerkUser);

  const value = useMemo(() => ({
    user,
    orders,
    syncError,
    isSignedIn: Boolean(isSignedIn && user),
    loading: !isLoaded || syncing,
    signOut: () => clerk.signOut({ redirectUrl: '/' }),
    addOrder(order) {
      if (!order) return;
      setOrders((current) => {
        if (current.some((existing) => existing.id === order.id)) return current;
        return [order, ...current];
      });
    },
  }), [user, orders, syncError, isSignedIn, isLoaded, syncing, clerk]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

function DisabledUserProvider({ children }) {
  const value = useMemo(() => ({
    user: null,
    orders: [],
    syncError: '',
    isSignedIn: false,
    loading: false,
    signOut: () => {},
    addOrder: () => {},
  }), []);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function UserProvider({ children }) {
  return CLERK_ENABLED
    ? <ClerkUserProvider>{children}</ClerkUserProvider>
    : <DisabledUserProvider>{children}</DisabledUserProvider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}
