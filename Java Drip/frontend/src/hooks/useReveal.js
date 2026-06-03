import { useEffect, useRef, useState } from 'react';

/**
 * Observes when an element enters the viewport and returns a visible flag.
 * Once visible, it stays visible (one-shot).
 *
 * Robust against React StrictMode double-invocation: uses a cancelled flag
 * so that if the effect is cleaned up before the observer fires, the stale
 * callback is ignored.
 */
export function useReveal(options = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;

    // Immediately check if element is already in (or near) the viewport.
    // This handles the case where items render above the current scroll
    // position or where React StrictMode tears down the effect mid-flight.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 100 && rect.bottom > -100) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!cancelled && entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0, rootMargin: '0px 0px 0px 0px', ...options }
    );

    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return [ref, visible];
}
