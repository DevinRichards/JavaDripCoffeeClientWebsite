import { useEffect, useMemo, useState } from 'react';
import LazyEmbed from '../components/LazyEmbed';
import Reveal from '../components/Reveal';
import SocialLogo from '../components/SocialLogo';
import { SOCIAL_PROFILES } from '../content/socialMedia';
import { fetchGallery } from '../api';

const GALLERY_CATEGORIES = ['All Media', 'Photos', 'Videos', 'Store + Team'];

function SafeImage({ src, alt, className }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-container">
        <span className="material-symbols-outlined text-5xl text-outline-variant">coffee</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export default function Gallery() {
  const [activeSocialId, setActiveSocialId] = useState('instagram');
  const [activeCategory, setActiveCategory] = useState('All Media');
  const [galleryCategories, setGalleryCategories] = useState([]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const activeSocial = SOCIAL_PROFILES.find((profile) => profile.id === activeSocialId) || SOCIAL_PROFILES[0];
  const filteredGalleryItems = useMemo(() => (
    activeCategory === 'All Media'
      ? galleryItems
      : galleryItems.filter((item) => item.category === activeCategory)
  ), [activeCategory, galleryItems]);

  useEffect(() => {
    fetchGallery()
      .then((response) => {
        setGalleryCategories(response.data?.categories || []);
        setGalleryItems(response.data?.items || []);
      })
      .catch(() => {
        setGalleryCategories([]);
        setGalleryItems([]);
      })
      .finally(() => setGalleryLoading(false));
  }, []);

  const categoryTabs = useMemo(() => {
    const names = galleryCategories.length > 0
      ? galleryCategories.map((category) => category.name)
      : GALLERY_CATEGORIES.filter((category) => category !== 'All Media');
    return ['All Media', ...names];
  }, [galleryCategories]);

  return (
    <div className="pt-20">
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
        <Reveal from="left" className="lg:col-span-7">
          <span className="font-label uppercase tracking-widest text-xs font-bold text-primary block mb-4">
            Gallery
          </span>
          <h1 className="font-headline text-[3.25rem] sm:text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-on-surface mb-6">
            PHOTO &
            <br className="sm:hidden" /> VIDEO
            <br />
            DRIFT
          </h1>
          <p className="w-full max-w-[19rem] sm:max-w-2xl text-lg text-on-surface-variant leading-relaxed">
            Explore the official Java Drip Coffee channels in one place, from daily updates to photos,
            video clips, and community moments.
          </p>
        </Reveal>

        <Reveal from="right" delay={120} className="lg:col-span-5">
          <div className="rounded-[32px] bg-surface-container-low p-6 shadow-sm">
            <p className="font-label text-[10px] uppercase tracking-widest font-bold text-primary mb-3">Java Drip Coffee Online</p>
            <p className="text-on-surface-variant leading-relaxed">
              Catch the latest from Java Drip Coffee across social media, from shop updates to everyday
              moments around the counter.
            </p>
          </div>
        </Reveal>
      </section>

      <section id="social-integration" className="bg-brand-charcoal-deep py-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <Reveal className="xl:col-span-5">
            <span className="font-label uppercase tracking-widest text-xs font-bold text-primary block mb-4">Social Integration</span>
            <h2 className="font-headline text-5xl font-black tracking-tighter text-white mb-5">
              FOLLOW THE
              <br />
              PULSE
            </h2>
            <p className="text-zinc-300 leading-relaxed max-w-lg mb-8">
              Follow the official Java Drip Coffee profiles for current posts, shop news, and behind-the-counter moments.
            </p>
            <div className="space-y-3" role="tablist" aria-label="Social media profiles">
              {SOCIAL_PROFILES.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setActiveSocialId(profile.id)}
                  role="tab"
                  aria-selected={activeSocial.id === profile.id}
                  className={`w-full rounded-3xl border p-5 text-left transition-all ${
                    activeSocial.id === profile.id
                      ? 'border-primary bg-primary text-white shadow-editorial'
                      : 'border-white/10 bg-white/5 text-white hover:border-primary/60 hover:bg-white/8'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      activeSocial.id === profile.id ? 'bg-white/18' : 'bg-primary/10'
                    }`}>
                      <SocialLogo
                        id={profile.id}
                        className={`h-5 w-5 ${activeSocial.id === profile.id ? 'text-white' : 'text-primary'}`}
                      />
                    </span>
                    <span className="min-w-0">
                      <span className={`block font-label text-[10px] uppercase tracking-widest font-bold ${
                        activeSocial.id === profile.id ? 'text-white/75' : 'text-primary'
                      }`}>
                        {profile.platform}
                      </span>
                      <span className="mt-1 block whitespace-nowrap font-headline text-[clamp(0.95rem,1.45vw,1.5rem)] font-black tracking-tight">
                        {profile.handle}
                      </span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120} className="xl:col-span-7">
            <div className="overflow-hidden rounded-[32px] bg-white shadow-editorial">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-5 bg-surface-container-low p-6 sm:p-8">
                  <div className="aspect-square overflow-hidden rounded-[28px] bg-white">
                    <SafeImage
                      src={activeSocial.image}
                      alt={`${activeSocial.platform} profile preview`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
                <div className="lg:col-span-7 p-6 sm:p-8">
                  <p className="font-label text-[10px] uppercase tracking-widest font-bold text-primary mb-3">
                    {activeSocial.platform} Bio
                  </p>
                  <h3 className="font-headline text-4xl font-black tracking-tight text-on-surface break-words">
                    {activeSocial.platform}
                  </h3>
                  <a
                    href={activeSocial.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex max-w-full whitespace-nowrap font-label text-sm font-bold uppercase tracking-widest text-primary hover:underline"
                  >
                    {activeSocial.handle}
                  </a>
                  <p className="mt-6 rounded-[24px] bg-surface-container-low p-5 text-lg font-bold leading-relaxed text-on-surface">
                    {activeSocial.bio}
                  </p>

                  {activeSocial.embedUrl ? (
                    <div className="mt-8 overflow-hidden rounded-[24px] border border-brand-charcoal/10">
                      <LazyEmbed
                        title={`Java Drip Coffee ${activeSocial.platform} profile`}
                        src={activeSocial.embedUrl}
                        height={420}
                        scrolling={activeSocial.id === 'facebook' ? 'no' : 'yes'}
                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
                        allowFullScreen
                        className="w-full bg-white"
                        placeholder={`Loading ${activeSocial.platform} profile.`}
                      />
                    </div>
                  ) : (
                    <div className="mt-8 rounded-[24px] border border-brand-charcoal/10 bg-surface-container-low p-5 text-sm text-on-surface-variant">
                      This profile is linked directly from the handle above.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-16 lg:py-20">
        <Reveal>
          <div className="mb-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <p className="font-label uppercase tracking-widest text-xs font-bold text-primary mb-3">Gallery Categories</p>
              <h2 className="font-headline text-5xl font-black tracking-tighter text-on-surface">
                BROWSE THE
                <br />
                PULSE
              </h2>
            </div>
            <p className="text-on-surface-variant max-w-xl leading-relaxed">
              {galleryItems.length > 0
                ? 'Browse the latest photos from Java Drip Coffee.'
                : 'No images at this time, come back soon.'}
            </p>
          </div>
        </Reveal>

        <div className="flex flex-wrap gap-3">
          {categoryTabs.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full px-5 py-3 font-label text-xs font-bold uppercase tracking-widest shadow-sm transition-all ${
                activeCategory === category
                  ? 'bg-primary text-white'
                  : 'bg-white text-on-surface hover:bg-primary hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {galleryLoading ? (
          <div className="mt-8 rounded-[28px] border border-brand-charcoal/10 bg-surface-container-low px-6 py-8 text-center">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">refresh</span>
            <p className="mt-3 font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Loading gallery.
            </p>
          </div>
        ) : filteredGalleryItems.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredGalleryItems.map((item, index) => (
              <Reveal key={item.id} delay={index * 60}>
                <article className="group overflow-hidden rounded-[32px] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-editorial">
                  <div className="aspect-[4/5] overflow-hidden bg-surface-container">
                    {item.media_type === 'video' ? (
                      <video
                        src={item.image_url}
                        className="h-full w-full object-cover"
                        controls
                        preload="metadata"
                        aria-label={item.title}
                      >
                      </video>
                    ) : (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="p-6">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-primary/10 px-3 py-1 font-label text-[10px] font-bold uppercase tracking-widest text-primary">
                        {item.category}
                      </span>
                      <span className="rounded-full bg-surface-container-high px-3 py-1 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        {item.media_type === 'video' ? 'Video' : 'Photo'}
                      </span>
                    </div>
                    <h3 className="font-headline text-2xl font-black tracking-tight text-on-surface">{item.title}</h3>
                    {item.caption && (
                      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{item.caption}</p>
                    )}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[28px] border border-brand-charcoal/10 bg-surface-container-low px-6 py-8 text-center">
            <span className="material-symbols-outlined text-4xl text-outline-variant">coffee</span>
            <p className="mt-3 font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              No images at this time, come back soon.
            </p>
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-16 lg:py-20">
        <Reveal>
          <div className="rounded-[32px] bg-surface-container-low p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <p className="font-label uppercase tracking-widest text-xs font-bold text-primary mb-3">Keep Following</p>
              <h2 className="font-headline text-4xl font-black tracking-tighter mb-3">Tap into the daily pulse.</h2>
              <p className="text-on-surface-variant max-w-2xl">
                Follow the official Java Drip Coffee channels for current posts, updates, and behind-the-counter moments.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {SOCIAL_PROFILES.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-white px-5 py-3 font-label text-xs uppercase tracking-widest font-bold text-on-surface shadow-sm transition-all hover:bg-primary hover:text-white"
                >
                  {item.platform}
                </a>
              ))}
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
