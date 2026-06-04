const rawPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

export const CLERK_PUBLISHABLE_KEY = rawPublishableKey.trim().replace(/^['"]|['"]$/g, '');

export const CLERK_KEY_MODE = CLERK_PUBLISHABLE_KEY.startsWith('pk_live_')
  ? 'production'
  : CLERK_PUBLISHABLE_KEY.startsWith('pk_test_')
    ? 'development'
    : 'missing';

export const CLERK_ENABLED = CLERK_KEY_MODE !== 'missing';

export const CLERK_KEY_STATUS = {
  enabled: CLERK_ENABLED,
  mode: CLERK_KEY_MODE,
  hasKey: Boolean(CLERK_PUBLISHABLE_KEY),
};
