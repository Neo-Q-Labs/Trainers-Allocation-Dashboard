import { useState, useEffect } from 'react';
import DatePicker from './DatePicker.jsx';

/* ============================================================
   DateRangeFilter — shared Start/End range control
   ------------------------------------------------------------
   Pending → committed pattern: the user edits the two
   DatePickers (pending), then Apply commits the range to the
   parent via onApply(start, end). Reset restores the supplied
   defaults. Used by the Dashboard and Trainer Matrix pages.
   ============================================================ */
export default function DateRangeFilter({
  start, end,
  defaultStart, defaultEnd,
  onApply,
  label = 'DATE RANGE',
}) {
  const [pStart, setPStart] = useState(start);
  const [pEnd, setPEnd]     = useState(end);

  // Keep pending in sync if the committed range changes externally.
  useEffect(() => { setPStart(start); setPEnd(end); }, [start, end]);

  const invalid = !!pStart && !!pEnd && pEnd < pStart;
  const dirty = pStart !== start || pEnd !== end;
  const isDefault = start === defaultStart && end === defaultEnd;
  const rangeDays = (pStart && pEnd && !invalid)
    ? Math.round((new Date(pEnd) - new Date(pStart)) / 86400000) + 1
    : 0;

  const apply = () => { if (!invalid) onApply(pStart, pEnd); };
  const reset = () => { setPStart(defaultStart); setPEnd(defaultEnd); onApply(defaultStart, defaultEnd); };

  return (
    <div className="drf">
      <span className="drf-label">{label}</span>
      <div className="drf-field">
        <span className="drf-flabel">START</span>
        <DatePicker value={pStart} onChange={setPStart} max={pEnd} ariaLabel="Start date" />
      </div>
      <span className="drf-arrow" aria-hidden="true">→</span>
      <div className="drf-field">
        <span className="drf-flabel">END</span>
        <DatePicker value={pEnd} onChange={setPEnd} min={pStart} ariaLabel="End date" />
      </div>
      <span className={`drf-badge${invalid ? ' is-err' : ''}`}>
        {invalid ? 'End ≥ Start' : `${rangeDays}d`}
      </span>
      <div className="drf-actions">
        <button type="button" className="drf-reset" onClick={reset} disabled={isDefault && !dirty}>
          Reset
        </button>
        <button type="button" className="drf-apply" onClick={apply} disabled={invalid || !dirty}>
          Apply
        </button>
      </div>
    </div>
  );
}
