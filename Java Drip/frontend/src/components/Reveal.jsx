import { useReveal } from '../hooks/useReveal';

/**
 * Wraps children in a div that fades + slides into view on scroll.
 *
 * Props:
 *   from      – 'bottom' (default) | 'left' | 'right' | 'fade'
 *   delay     – transition-delay in ms (for staggering siblings)
 *   className – forwarded to the wrapper div (grid columns, etc.)
 *   duration  – transition duration in ms (default 750)
 */
export default function Reveal({ children, from = 'bottom', delay = 0, className = '', duration = 750 }) {
  const [ref, visible] = useReveal();

  const dirClass =
    from === 'left' ? 'from-left' :
    from === 'right' ? 'from-right' :
    from === 'fade' ? 'from-fade' : '';

  return (
    <div
      ref={ref}
      className={`reveal ${dirClass} ${visible ? 'is-visible' : ''} ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: delay ? `${delay}ms` : undefined,
      }}
    >
      {children}
    </div>
  );
}
