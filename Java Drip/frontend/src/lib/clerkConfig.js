const rawPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

export const CLERK_PUBLISHABLE_KEY = rawPublishableKey.trim().replace(/^['"]|['"]$/g, '');

export const CLERK_ENABLED = /^pk_(test|live)_[A-Za-z0-9_-]+$/.test(CLERK_PUBLISHABLE_KEY);
