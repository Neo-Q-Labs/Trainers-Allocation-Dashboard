import { useState, useEffect, useRef } from 'react';

/* ============================================================
   DatePicker — popover calendar matching the design reference
   ------------------------------------------------------------
   Used by both the Overview filter and the New-Requirement
   Simulator. The trigger renders the date in long form
   (e.g. "25 May 2026"); the popover shows a month grid with
   « ‹ MONTH YEAR › » navigation.
   ============================================================ */

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const toIso = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const fmtPretty = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const parseIsoLocal = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function DatePicker({ value, onChange, min, max, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => parseIsoLocal(value) || new Date());
  const rootRef = useRef(null);

  useEffect(() => {
    const v = parseIsoLocal(value);
    if (v) setView(new Date(v.getFullYear(), v.getMonth(), 1));
  }, [value]);

  // Outside-click close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const todayIso = toIso(new Date());
  const minDate = parseIsoLocal(min);
  const maxDate = parseIsoLocal(max);

  // Build 6-row × 7-col grid of cells (Sunday-start)
  const monthStart = new Date(view.getFullYear(), view.getMonth(), 1);
  const monthEnd = new Date(view.getFullYear(), view.getMonth() + 1, 0);
  const startWd = monthStart.getDay(); // 0 = Sun
  const daysInMonth = monthEnd.getDate();

  const cells = [];
  for (let i = startWd; i > 0; i--) {
    const d = new Date(view.getFullYear(), view.getMonth(), 1 - i);
    cells.push({ date: d, inMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ date: new Date(view.getFullYear(), view.getMonth(), i), inMonth: true });
  }
  while (cells.length < 42) {
    const lastDate = cells[cells.length - 1].date;
    cells.push({ date: addDays(lastDate, 1), inMonth: false });
  }

  const stepMonth = (delta) =>
    setView(new Date(view.getFullYear(), view.getMonth() + delta, 1));
  const stepYear = (delta) =>
    setView(new Date(view.getFullYear() + delta, view.getMonth(), 1));

  const pick = (d) => {
    onChange?.(toIso(d));
    setOpen(false);
  };

  const monthLabel = view
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    .toUpperCase();

  return (
    <div ref={rootRef} className="ov-dp">
      <button
        type="button"
        className={`ov-dp-trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel || 'Select date'}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span className="ov-dp-value">{fmtPretty(value)}</span>
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ov-dp-caret">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="ov-dp-pop" role="dialog">
          <div className="ov-dp-head">
            <button type="button" className="ov-dp-nav" onClick={() => stepYear(-1)} aria-label="Previous year">&laquo;</button>
            <button type="button" className="ov-dp-nav" onClick={() => stepMonth(-1)} aria-label="Previous month">&lsaquo;</button>
            <div className="ov-dp-title">{monthLabel}</div>
            <button type="button" className="ov-dp-nav" onClick={() => stepMonth(1)} aria-label="Next month">&rsaquo;</button>
            <button type="button" className="ov-dp-nav" onClick={() => stepYear(1)} aria-label="Next year">&raquo;</button>
          </div>

          <div className="ov-dp-wd">
            {WEEKDAYS.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>

          <div className="ov-dp-grid">
            {cells.map((c, i) => {
              const iso = toIso(c.date);
              const isSelected = value && iso === value;
              const isToday = iso === todayIso;
              const isOutOfRange =
                (minDate && c.date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) ||
                (maxDate && c.date > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()));
              const cls = [
                'ov-dp-cell',
                isSelected ? 'is-selected' : '',
                isToday ? 'is-today' : '',
                !c.inMonth ? 'is-out' : '',
              ].filter(Boolean).join(' ');
              return (
                <button
                  key={i}
                  type="button"
                  className={cls}
                  disabled={isOutOfRange}
                  onClick={() => pick(c.date)}
                >
                  {c.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
