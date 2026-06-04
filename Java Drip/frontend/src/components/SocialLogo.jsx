export default function SocialLogo({ id, className = '' }) {
  if (id === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path fill="currentColor" d="M14.3 8.7h2.1V5.2c-.4-.1-1.7-.2-3.2-.2-3.2 0-5.3 1.9-5.3 5.5v3.1H4.5v3.9h3.4V24h4.1v-6.5h3.3l.6-3.9H12v-2.7c0-1.1.3-2.2 2.3-2.2Z" />
      </svg>
    );
  }

  if (id === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path fill="currentColor" d="M16.7 3c.3 2.1 1.5 3.5 3.6 3.7v3.7c-1.2.1-2.4-.3-3.5-1v6.7c0 3.4-2.1 5.9-5.5 5.9-3 0-5.5-2.1-5.5-5.2 0-3.6 3.2-5.8 6.7-5.1v3.8c-1.4-.4-2.7.2-2.7 1.4 0 .9.7 1.5 1.6 1.5 1.1 0 1.7-.7 1.7-2V3h3.6Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect width="17" height="17" x="3.5" y="3.5" fill="none" stroke="currentColor" strokeWidth="2.2" rx="5" />
      <circle cx="12" cy="12" r="3.8" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="17.1" cy="6.9" r="1.2" fill="currentColor" />
    </svg>
  );
}
