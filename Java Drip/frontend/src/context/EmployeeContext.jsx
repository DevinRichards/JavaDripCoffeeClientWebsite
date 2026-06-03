import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { adminLogin, fetchAdminSession } from '../api';

const TOKEN_STORAGE_KEY = 'jd_admin_token';
const USER_STORAGE_KEY = 'jd_admin_user';
const STAFF_SIGNED_IN_EVENT = 'jd:staff-signed-in';
const CUSTOMER_SIGNED_IN_EVENT = 'jd:customer-signed-in';

const EmployeeContext = createContext(null);

function readJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function EmployeeProvider({ children }) {
  const [token, setToken] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordResetRecommended, setPasswordResetRecommended] = useState(false);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedUser = readJson(USER_STORAGE_KEY, null);

    if (!storedToken) {
      setLoading(false);
      return;
    }

    setToken(storedToken);
    setEmployee(storedUser);

    fetchAdminSession(storedToken)
      .then((response) => {
        setEmployee(response.data.user);
        setPasswordResetRecommended(Boolean(response.data.passwordResetRecommended));
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.localStorage.removeItem(USER_STORAGE_KEY);
        setToken(null);
        setEmployee(null);
        setPasswordResetRecommended(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleCustomerSignedIn = () => {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(USER_STORAGE_KEY);
      setToken(null);
      setEmployee(null);
      setPasswordResetRecommended(false);
    };

    window.addEventListener(CUSTOMER_SIGNED_IN_EVENT, handleCustomerSignedIn);
    return () => window.removeEventListener(CUSTOMER_SIGNED_IN_EVENT, handleCustomerSignedIn);
  }, []);

  const signIn = async (credentials) => {
    const response = await adminLogin(credentials);
    window.dispatchEvent(new Event(STAFF_SIGNED_IN_EVENT));
    window.localStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data.user));
    setToken(response.data.token);
    setEmployee(response.data.user);
    setPasswordResetRecommended(Boolean(response.data.passwordResetRecommended));
    return response.data.user;
  };

  const signOut = () => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setEmployee(null);
    setPasswordResetRecommended(false);
  };

  const value = useMemo(() => ({
    employee,
    token,
    loading,
    isEmployeeSignedIn: Boolean(token && employee),
    passwordResetRecommended,
    signIn,
    signOut,
  }), [employee, token, loading, passwordResetRecommended]);

  return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>;
}

export function useEmployee() {
  const context = useContext(EmployeeContext);
  if (!context) throw new Error('useEmployee must be used within EmployeeProvider');
  return context;
}
