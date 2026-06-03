import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import Reveal from '../components/Reveal';
import {
  FACEBOOK_EMBED_URL,
  FACEBOOK_URL,
  INSTAGRAM_URL,
  SOCIAL_SPOTLIGHTS,
  TIKTOK_URL,
} from '../content/socialMedia';
const HERO_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuACCR2S0ytvA0ydCCp5I5AljtGulZcL8-PHvsd9bzgaMsR0EcILoh_bWka2UpgRACkxdXPaQ6fdVeecsEh51LzylFLoE4Jyeqy4YCil-F-wUX0BRcqRuAnJdfls4Y4QcD428xN6eCouMpX-7U9Y9xzx5Kuoj-wKfsx1rc6w8hdykdi7ctZ0vWNUw4-3uHbzDxyM7TzCoNj_Q2Kn7J5Kfp3Lwf6VQFJsh17vJG4pXzbwRtrtaB_jFf-9EcQnvYEbazQbpaNtu4uhCfU';
const SOCIAL_IMAGE_FALLBACKS = {
  Instagram: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=900&q=80&fit=crop',
  Facebook: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80&fit=crop',
  TikTok: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=900&q=80&fit=crop',
};

const GALLERY_PREVIEW_CARDS = [
  {
    title: 'Drink Photos',
    label: 'Photos',
    icon: 'local_cafe',
    description: 'A branded placeholder space for drink photography if owned media becomes available later.',
  },
  {
    title: 'Store + Team',
    label: 'Shop',
    icon: 'storefront',
    description: 'A flexible gallery tile for storefront, staff, and community moments when the brand chooses to share them.',
  },
  {
    title: 'Video Moments',
    label: 'Video',
    icon: 'play_circle',
    description: 'Placeholder for approved reels, drink builds, and behind-the-counter clips.',
  },
];

function SocialSpotlightImage({ item }) {
  const placeholderSrc = SOCIAL_IMAGE_FALLBACKS[item.platform] || item.image;
  const [activeSrc, setActiveSrc] = useState(placeholderSrc);
  const [fallbackTried, setFallbackTried] = useState(false);

  const handleError = () => {
    const fallbackSrc = SOCIAL_IMAGE_FALLBACKS[item.platform];

    if (!fallbackTried && fallbackSrc && fallbackSrc !== activeSrc) {
      setFallbackTried(true);
      setActiveSrc(fallbackSrc);
      return;
    }

    setActiveSrc(null);
  };

  if (!activeSrc) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,_rgba(179,0,101,0.12),_rgba(255,110,169,0.28))]">
        <span className="px-2 text-center font-label text-[9px] font-bold uppercase tracking-widest text-primary">
          Java Drip
        </span>
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt=""
      aria-hidden="true"
      className="h-full w-full object-cover"
      loading="lazy"
      onError={handleError}
    />
  );
}

export default function Home() {
  const [showLoginToast, setShowLoginToast] = useState(false);
  const { user, isSignedIn } = useUser();
  const [wasSignedIn, setWasSignedIn] = useState(isSignedIn);

  useEffect(() => {
    if (!isSignedIn || !user) {
      setWasSignedIn(false);
      return undefined;
    }

    if (wasSignedIn) {
      return undefined;
    }

    setWasSignedIn(true);
    setShowLoginToast(true);

    const hideTimer = window.setTimeout(() => {
      setShowLoginToast(false);
    }, 4400);

    return () => window.clearTimeout(hideTimer);
  }, [isSignedIn, user, wasSignedIn]);

  return (
    <>
      {showLoginToast && user && (
        <div
          className="login-toast fixed left-1/2 top-24 z-[60] w-[min(calc(100%-2rem),560px)] -translate-x-1/2 rounded-[28px] bg-white/88 px-6 py-4 shadow-editorial backdrop-blur-xl"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-white">✓</span>
            <div>
              <p className="font-label uppercase tracking-widest text-[10px] font-bold text-primary">Signed In</p>
              <p className="font-medium text-on-surface">Welcome back, {user.name.split(' ')[0]}. Your account is live and your pickup history is ready.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden bg-surface pt-20">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            className="w-full h-full object-cover opacity-60"
            src={HERO_IMG}
            alt="Java Drip coffee shop interior"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/70 to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8">
          <div className="max-w-2xl">
            <span className="hero-anim hero-anim-1 font-headline font-bold text-primary tracking-[0.2em] uppercase text-sm mb-4 block">
              The Metropolitan Pulse
            </span>
            <h1 className="hero-anim hero-anim-2 text-[4rem] sm:text-7xl md:text-9xl font-black text-on-surface tracking-tighter leading-[0.85] mb-8">
              KINETIC<br />BREWS
            </h1>
            <p className="hero-anim hero-anim-3 w-full max-w-[19rem] sm:max-w-md text-lg text-on-surface-variant mb-10 leading-relaxed">
              Fueled by the city's energy. High-end editorial coffee experiences delivered with a metropolitan pace.
            </p>
            <div className="hero-anim hero-anim-4 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
              <Link
                to="/menu"
                className="kinetic-gradient text-white px-8 py-4 sm:px-10 sm:py-5 rounded-lg font-headline font-bold uppercase tracking-wider shadow-editorial hover:scale-[1.02] active:scale-95 transition-all"
              >
                Start Pickup Order
              </Link>
              <Link
                to="/menu"
                className="text-on-surface font-headline font-bold uppercase tracking-wider flex items-center gap-2 group hover:text-primary transition-colors"
              >
                Explore Menu
                <span aria-hidden="true" className="text-xl leading-none transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute -right-20 top-1/2 -translate-y-1/2 hidden lg:block">
          <div className="w-[500px] h-[500px] bg-secondary-container/20 rounded-full blur-[100px]" />
        </div>
      </section>

      {/* ── Social Feed ── */}
      <Reveal>
        <section className="py-28 lg:py-32 px-8 bg-surface-container-low">
          <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            <div className="xl:col-span-6">
              <p className="font-label uppercase tracking-[0.24em] text-xs font-bold text-primary mb-4">Social Media</p>
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-5 leading-[0.9]">FOLLOW THE PULSE</h2>
              <p className="text-lg text-on-surface-variant mb-10 max-w-2xl leading-relaxed">
                Stay dialed in with the Java Drip Coffee feed. The Facebook timeline is embedded directly on the site,
                while Instagram and TikTok keep the faster visual energy moving.
              </p>
              <div className="space-y-4">
                {SOCIAL_SPOTLIGHTS.map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-5 rounded-[32px] bg-white p-5 shadow-editorial transition-all hover:-translate-y-1"
                  >
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[24px] md:h-28 md:w-28">
                      <SocialSpotlightImage item={item} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-label text-[10px] uppercase tracking-widest font-bold text-primary mb-1">
                        {item.platform}
                      </p>
                      <p className="font-headline text-xl md:text-2xl font-black tracking-tight text-on-surface">{item.title}</p>
                      <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
                    </div>
                  </a>
                ))}
              </div>
              <div className="flex flex-wrap gap-4 mt-8">
                {[
                  { href: INSTAGRAM_URL, label: 'Instagram', icon: 'photo_camera' },
                  { href: FACEBOOK_URL, label: 'Facebook', icon: 'thumb_up' },
                  { href: TIKTOK_URL, label: 'TikTok', icon: 'music_note' },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-3 bg-white rounded-full font-label font-bold text-sm uppercase tracking-wider text-on-surface hover:bg-primary hover:text-white transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    {item.label}
                  </a>
                ))}
                <Link
                  to="/gallery"
                  className="flex items-center gap-2 px-5 py-3 rounded-full border border-outline-variant/30 font-label font-bold text-sm uppercase tracking-wider text-on-surface hover:border-primary hover:text-primary transition-all"
                >
                  <span aria-hidden="true" className="text-base leading-none">▦</span>
                  Open Gallery
                </Link>
              </div>
            </div>

            <div className="xl:col-span-6">
              <div className="overflow-hidden rounded-[36px] bg-white p-4 shadow-editorial">
                <iframe
                  title="Java Drip Coffee Facebook feed"
                  src={FACEBOOK_EMBED_URL}
                  width="100%"
                  height="760"
                  style={{ border: 'none', overflow: 'hidden' }}
                  scrolling="no"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  className="w-full rounded-[28px]"
                />
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── Gallery Preview ── */}
      <Reveal>
        <section className="py-24 lg:py-28 px-8 bg-surface">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
              <div>
                <p className="font-label uppercase tracking-[0.24em] text-xs font-bold text-primary mb-4">Gallery</p>
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9]">
                  SOCIAL-FIRST
                  <br />
                  GALLERY
                </h2>
              </div>
              <p className="text-lg text-on-surface-variant max-w-xl leading-relaxed">
                Since owned media is not available right now, this area stays polished with branded placeholder cards
                and directs visitors toward the official social feeds.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {GALLERY_PREVIEW_CARDS.map((card, index) => (
                <Reveal key={card.title} delay={index * 90}>
                  <div className="group relative min-h-[340px] overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,_#f6f2ee_0%,_#ece3e7_55%,_#d8dadd_100%)] p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-editorial">
                    <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.9),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(179,0,101,0.14),transparent_24%),linear-gradient(135deg,transparent_0%,rgba(48,50,52,0.1)_100%)]" />
                    <div className="relative z-10 flex h-full min-h-[286px] flex-col justify-between">
                      <div className="flex items-center justify-between gap-4">
                        <span className="rounded-full bg-white px-4 py-2 font-label text-[10px] font-bold uppercase tracking-widest text-primary">
                          {card.label}
                        </span>
                        <span className="material-symbols-outlined text-4xl text-primary/80">{card.icon}</span>
                      </div>
                      <div>
                        <p className="mb-3 font-label text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
                          Java Drip Coffee
                        </p>
                        <h3 className="font-headline text-3xl font-black tracking-tight text-on-surface">{card.title}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{card.description}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <div className="mt-10">
              <Link
                to="/gallery"
                className="inline-flex items-center gap-3 rounded-full kinetic-gradient px-6 py-4 font-label text-xs font-bold uppercase tracking-widest text-white shadow-editorial transition-all hover:scale-[1.02] active:scale-95"
              >
                View Full Gallery
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </>
  );
}
