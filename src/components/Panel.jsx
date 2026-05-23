import { useEffect, useRef } from 'react';

/**
 * Renders the panel's raw HTML once (so the runtime scripts can populate
 * #stackChart, #calWrap, #heatmap, etc.), and toggles `.active` via DOM
 * on subsequent prop changes — React doesn't re-write innerHTML.
 */
export default function Panel({ name, html, active }) {
  const ref = useRef(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!ref.current || mounted.current) return;
    ref.current.innerHTML = html;
    mounted.current = true;
  }, [html]);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.classList.toggle('active', !!active);
  }, [active]);

  return (
    <section
      ref={ref}
      className={`panel${active ? ' active' : ''}`}
      data-panel={name}
    />
  );
}
