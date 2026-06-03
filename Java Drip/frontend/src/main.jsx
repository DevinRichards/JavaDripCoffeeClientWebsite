import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import App from './App.jsx';
import { UserProvider } from './context/UserContext.jsx';
import { EmployeeProvider } from './context/EmployeeContext.jsx';
import { CLERK_ENABLED, CLERK_PUBLISHABLE_KEY } from './lib/clerkConfig.js';
import './index.css';

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
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
        {appContent}
      </ClerkProvider>
    ) : (
      appContent
    )}
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById('root')).render(appTree);
