/* Tiny SVG sparkline — accepts a values array and renders a smooth polyline
   with a trailing dot. Used by the Conflicts and Open-Gap tiles. */
export default function Sparkline({
  values = [],
  width = 120,
  height = 32,
  stroke = 'var(--neon-yellow)',
  fill = 'rgba(245,158,11,0.10)',
  ariaLabel,
}) {
  if (!values.length) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const path = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const area = `${path} L${width},${height} L0,${height} Z`;
  const [lastX, lastY] = pts[pts.length - 1];
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel || 'trend'}
    >
      <path d={area} fill={fill} stroke="none" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2.4" fill={stroke} />
    </svg>
  );
}
