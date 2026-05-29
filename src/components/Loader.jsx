import { useEffect, useRef, useState } from 'react';

// Q Labs bolt loader — drop-in. Pair with loader.css (import once, globally).
//
//   <Loader />                       inline, medium
//   <Loader size="sm" />             compact
//   <Loader label="Loading…" />      with caption
//   <Loader fullScreen label="…" />  centered boot/overlay — bolt fills ~3/5 of the screen
//
// A sharp lightning bolt drawn as one continuous outline so it can sketch
// itself: faint track + self-drawing neon line + energising fill + two
// shockwaves. Styling/keyframes + theme rules live in loader.css (.ql-*).
const BOLT_D = 'M74 6 L30 112 L60 112 L46 202 L98 84 L66 84 Z';

export default function Loader({ size = 'md', label, fullScreen = false, className = '' }) {
  const ref = useRef(null);
  const [len, setLen] = useState(560);

  useEffect(() => {
    if (ref.current) {
      try { setLen(Math.ceil(ref.current.getTotalLength())); } catch { /* noop */ }
    }
  }, []);

  const px = size === 'sm' ? 42 : size === 'lg' ? 110 : 72;
  const sizeVal = fullScreen ? 'min(36vh, 58vw)' : `${px}px`;
  const glowVal = fullScreen ? '2.6vmin' : `${Math.round(px * 0.13)}px`;
  const cls = ['ql-loader', fullScreen && 'ql-full', className].filter(Boolean).join(' ');

  return (
    <div className={cls} style={{ '--size': sizeVal, '--glow': glowVal }}>
      <svg className="ql-bolt-svg" viewBox="0 0 128 210" style={{ '--len': len }} aria-hidden="true">
        <path className="ql-pulse p1" d={BOLT_D} />
        <path className="ql-pulse p2" d={BOLT_D} />
        <path className="ql-track" d={BOLT_D} />
        <path className="ql-fill" d={BOLT_D} />
        <path className="ql-draw" ref={ref} d={BOLT_D} />
      </svg>
      {label && <span className="ql-loader-label">{label}</span>}
    </div>
  );
}
