import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import App from './App.jsx';
import { UserProvider } from './context/UserContext.jsx';
import { EmployeeProvider } from './context/EmployeeContext.jsx';
import './index.css';

const CLERK_ENABLED = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

const appContent = (
  <EmployeeProvider>
    <UserProvider>
      <App />
    </UserProvider>
  </EmployeeProvider>
);

const appTree = (
  <React.StrictMode>
    {CLERK_ENABLED ? (
      <ClerkProvider afterSignOutUrl="/">
        {appContent}
      </ClerkProvider>
    ) : (
      appContent
    )}
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById('root')).render(appTree);
