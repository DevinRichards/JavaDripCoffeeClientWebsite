import { useEffect, useRef, useState } from 'react';

export default function LazyEmbed({
  title,
  src,
  height = 420,
  className = '',
  scrolling = 'no',
  allow = 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share',
  allowFullScreen,
  referrerPolicy,
  placeholder = 'Loading feed.',
}) {
  const wrapperRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return undefined;

    const node = wrapperRef.current;
    if (!node) return undefined;

    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '500px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={wrapperRef} className={className} style={{ minHeight: height }}>
      {shouldLoad ? (
        <iframe
          title={title}
          src={src}
          width="100%"
          height={height}
          style={{ border: 'none', overflow: 'hidden' }}
          scrolling={scrolling}
          allow={allow}
          allowFullScreen={allowFullScreen}
          loading="lazy"
          referrerPolicy={referrerPolicy}
          className="h-full w-full bg-white"
        />
      ) : (
        <div className="flex h-full min-h-[inherit] w-full items-center justify-center bg-surface-container-low text-center">
          <div>
            <span className="material-symbols-outlined text-4xl text-primary">public</span>
            <p className="mt-3 font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              {placeholder}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
