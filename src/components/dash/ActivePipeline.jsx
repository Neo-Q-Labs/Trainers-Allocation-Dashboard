import { useMemo, useState } from 'react';

/* ============================================================
   ActivePipeline — Ranked list of live requirements
   ------------------------------------------------------------
   Source: /api/v1/request-track rows. Each row is summarised
   into:  delivery_id · course/title · client · domain · date
   window · day-count · required vs filled · status.
   Sorting: high-risk (low %) first, then days-to-start asc.
   ============================================================ */

const STATUS_TONE = {
  OPEN:     'open',
  GAP:      'gap',
  CLOSED:   'closed',
  CANCELLED:'cancelled',
};

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

function parseSheetDate(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return new Date(EXCEL_EPOCH + raw * 86400000);
  }
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return new Date(EXCEL_EPOCH + Number(s) * 86400000);
  const ts = Date.parse(s);
  return Number.isFinite(ts) ? new Date(ts) : null;
}

const fmtShort = (d) => (d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—');

const num = (v) => {
  const n = parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

function summarise(row) {
  const trReq = num(row['Total Trainer Required']);
  const taReq = num(row["Total TA's Required"]);
  const required = trReq + taReq;
  const internal = num(row['Internal']);
  const fl = num(row['Existing Freelancers']) + num(row['New Freelancers Hired']);
  const filled = internal + fl;
  const gap = Math.max(0, required - filled);
  const pct = required > 0 ? filled / required : 1;

  const alloc = String(row['Allocation Status'] || '').toLowerCase();
  const train = String(row['Training Status'] || '').toLowerCase();
  const isCancelled = /cancel|drop/.test(alloc) || /cancel|drop/.test(train);
  const isClosed    = /closed?|complete/.test(alloc) || /closed?|complete/.test(train);

  const start = parseSheetDate(row['Program Start Date']);
  const end   = parseSheetDate(row['Program End Date']);
  const days  = (start && end) ? Math.max(1, Math.round((end - start) / 86400000) + 1) : null;

  let status, tone;
  if (isCancelled) { status = 'CANCELLED'; tone = 'cancelled'; }
  else if (isClosed && gap === 0) { status = 'CLOSED'; tone = 'closed'; }
  else if (gap > 0) { status = 'GAP'; tone = 'gap'; }
  else { status = 'OPEN'; tone = 'open'; }

  return {
    delivery_id: String(row['Delivery ID'] || '').trim(),
    client:      String(row['Client Name'] || '').trim(),
    course:      String(row['Course'] || '').trim(),
    domain:      String(row['Domain'] || '').trim(),
    subdomain:   String(row['Subdomain'] || '').trim(),
    start, end, days,
    required, filled, gap, pct,
    status, tone,
  };
}

const FILTERS = [
  { id: 'all',  label: 'ALL' },
  { id: 'high', label: 'HIGH RISK' },
  { id: 'gap',  label: 'GAP' },
  { id: 'open', label: 'OPEN' },
];

export default function ActivePipeline({ rows = [], onOpen, rangeStart, rangeEnd }) {
  const [filter, setFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);

  // Optional date-range overlap window (from the Dashboard filter).
  const rangeStartMs = rangeStart ? new Date(rangeStart).getTime() : null;
  const rangeEndMs   = rangeEnd   ? new Date(rangeEnd).getTime()   : null;

  const summaries = useMemo(() => {
    return (rows || [])
      .map(summarise)
      .filter((s) => s.delivery_id || s.client || s.course)
      .filter((s) => {
        // When a range is supplied, keep requirements whose window overlaps it.
        // Rows missing both dates are always kept (can't be excluded reliably).
        if (rangeStartMs == null || rangeEndMs == null) return true;
        if (!s.start && !s.end) return true;
        const st = s.start ? s.start.getTime() : -Infinity;
        const en = s.end ? s.end.getTime() : Infinity;
        return st <= rangeEndMs && en >= rangeStartMs;
      });
  }, [rows, rangeStartMs, rangeEndMs]);

  const filtered = useMemo(() => {
    const arr = summaries.filter((s) => {
      if (filter === 'high') return s.pct < 0.33;
      if (filter === 'gap')  return s.tone === 'gap';
      if (filter === 'open') return s.tone === 'open';
      return true;
    });
    arr.sort((a, b) => (a.pct - b.pct) || ((a.start?.getTime() || Infinity) - (b.start?.getTime() || Infinity)));
    return arr;
  }, [summaries, filter]);

  const liveCount = summaries.length;
  const highRiskCount = summaries.filter((s) => s.pct < 0.33).length;
  const visible = showAll ? filtered : filtered.slice(0, 5);

  return (
    <div className="dash-card dash-pipe">
      <div className="dash-pipe-head">
        <div>
          <div className="dash-card-title">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            ACTIVE PIPELINE
          </div>
          <div className="dash-pipe-sub">Ranked by risk + days-to-start</div>
        </div>
        <div className="dash-pipe-tags">
          <span className="dash-pipe-tag dash-pipe-tag-live">● {liveCount} LIVE</span>
          {highRiskCount > 0 && (
            <span className="dash-pipe-tag dash-pipe-tag-risk">● {highRiskCount} HIGH RISK</span>
          )}
        </div>
      </div>

      <div className="dash-pipe-filters" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`dash-pipe-filter${filter === f.id ? ' is-active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="dash-pipe-empty">No requirements match this filter.</div>
      ) : (
        <ul className="dash-pipe-list">
          {visible.map((r, i) => <PipeRow key={`${r.delivery_id}-${i}`} r={r} onOpen={onOpen} />)}
        </ul>
      )}

      <div className="dash-pipe-foot">
        <span>SHOWING <strong>{visible.length}</strong> OF <strong>{filtered.length}</strong></span>
        {filtered.length > 5 && (
          <button type="button" className="dash-pipe-more" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'SHOW LESS' : 'SHOW ALL'}
          </button>
        )}
      </div>
    </div>
  );
}

function PipeRow({ r, onOpen }) {
  const tone = STATUS_TONE[r.status] || 'open';
  const pctClamped = Math.max(0, Math.min(1, r.pct || 0));
  const tagBits = [r.domain, r.subdomain].filter(Boolean);

  return (
    <li className={`dash-pipe-row dash-pipe-row-${tone}`}>
      <div className={`dash-pipe-bar dash-pipe-bar-${tone}`} />
      <div className="dash-pipe-meta">
        <div className="dash-pipe-title">{r.course || r.delivery_id || '—'}</div>
        <div className="dash-pipe-meta-line">
          <span className="dash-pipe-id">{r.delivery_id || '—'}</span>
          {r.client && <><span className="dash-pipe-dot">·</span><span>{r.client}</span></>}
        </div>
        {tagBits.length > 0 && (
          <div className="dash-pipe-tags-inline">
            {tagBits.map((t, i) => <span key={i} className="dash-pipe-skill">{t}</span>)}
          </div>
        )}
      </div>
      <div className="dash-pipe-window">
        <div className="dash-pipe-when">
          {r.start || r.end ? <>{fmtShort(r.start)} → {fmtShort(r.end)}</> : 'No dates'}
        </div>
        {r.days && <div className="dash-pipe-days">{r.days} DAYS</div>}
      </div>
      <div className="dash-pipe-trainers">
        <div className="dash-pipe-trainer-num">{r.required || '—'}</div>
        <div className="dash-pipe-trainer-lab">TRAINERS</div>
      </div>
      <div className="dash-pipe-progress">
        <div className="dash-pipe-progress-bar">
          <div className={`dash-pipe-progress-fill is-${tone}`} style={{ width: `${pctClamped * 100}%` }} />
        </div>
        <div className="dash-pipe-progress-text">
          <strong>{r.filled}</strong>/<strong>{r.required}</strong>
        </div>
      </div>
      <span className={`dash-pipe-status dash-pipe-status-${tone}`}>
        <span className="dash-pipe-status-dot" />
        {r.status}
      </span>
      <button type="button" className="dash-pipe-action" aria-label="Open requirement" onClick={() => onOpen?.(r)}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      </button>
    </li>
  );
}
