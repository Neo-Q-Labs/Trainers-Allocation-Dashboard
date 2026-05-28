/* Inline SVG icon set used across the Dashboard tiles.
   Strokes use `currentColor`, sized 14×14 to fit chip-style boxes. */
import { createElement as h } from 'react';

const wrap = (children) => h('svg', {
  viewBox: '0 0 24 24', width: 14, height: 14,
  fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
}, children);

export const ICONS = {
  doc:    wrap(h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }), h('polyline', { points: '14 2 14 8 20 8' })),
  people: wrap(h('path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }), h('circle', { cx: 9, cy: 7, r: 4 }), h('path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }), h('path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' })),
  check:  wrap(h('polyline', { points: '20 6 9 17 4 12' })),
  warn:   wrap(h('path', { d: 'M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' }), h('path', { d: 'M12 9v4M12 17h.01' })),
  globe:  wrap(h('circle', { cx: 12, cy: 12, r: 10 }), h('path', { d: 'M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' })),
  alert:  wrap(h('circle', { cx: 12, cy: 12, r: 10 }), h('line', { x1: 12, y1: 8, x2: 12, y2: 12 }), h('line', { x1: 12, y1: 16, x2: 12.01, y2: 16 })),
  riskHi: wrap(h('path', { d: 'M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' }), h('path', { d: 'M12 9v4M12 17h.01' })),
  spark:  wrap(h('polyline', { points: '3 17 9 11 13 15 21 7' })),
  layers: wrap(h('path', { d: 'M12 2 2 7l10 5 10-5-10-5z' }), h('path', { d: 'M2 17l10 5 10-5M2 12l10 5 10-5' })),
  chart:  wrap(h('line', { x1: 18, y1: 20, x2: 18, y2: 10 }), h('line', { x1: 12, y1: 20, x2: 12, y2: 4 }), h('line', { x1: 6, y1: 20, x2: 6, y2: 14 })),
  hire:   wrap(h('path', { d: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }), h('circle', { cx: 8.5, cy: 7, r: 4 }), h('line', { x1: 20, y1: 8, x2: 20, y2: 14 }), h('line', { x1: 23, y1: 11, x2: 17, y2: 11 })),
  swap:   wrap(h('polyline', { points: '17 1 21 5 17 9' }), h('path', { d: 'M3 11V9a4 4 0 0 1 4-4h14' }), h('polyline', { points: '7 23 3 19 7 15' }), h('path', { d: 'M21 13v2a4 4 0 0 1-4 4H3' })),
  close:  wrap(h('circle', { cx: 12, cy: 12, r: 10 }), h('polyline', { points: '20 6 9 17 4 12' })),
  beaker: wrap(h('path', { d: 'M4.5 3h15M6 3v7l-3 9a2 2 0 0 0 2 3h14a2 2 0 0 0 2-3l-3-9V3' })),
  search: wrap(h('circle', { cx: 11, cy: 11, r: 8 }), h('line', { x1: 21, y1: 21, x2: 16.65, y2: 16.65 })),
  download: wrap(h('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }), h('polyline', { points: '7 10 12 15 17 10' }), h('line', { x1: 12, y1: 15, x2: 12, y2: 3 })),
};
