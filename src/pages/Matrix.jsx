import { useState, useMemo, useEffect } from 'react';
import { useGetTrainersQuery } from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';
import DatePicker from '../components/DatePicker.jsx';

/* ============================================================
   Trainer Matrix
   ------------------------------------------------------------
   Live matrix of every trainer × the next 30 days, sourced
   from Trainer Data Live (via /api/v1/trainers). A dropdown
   switches between the Internal pool (FT + SME + WILP) and
   the Freelancer pool. Each cell colour-codes the trainer's
   allotment for that date.
   ============================================================ */

const INTERNAL_TYPES = new Set(['FT', 'SME', 'WILP']);

// Pagination — chosen as a balance between scannable matrix density and
// scroll-fatigue. 25 keeps the grid roughly one viewport tall on 1440p.
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

const POOLS = [
  { id: 'internal',   label: 'Internal',   sub: 'FT · SME · WILP' },
  { id: 'freelancer', label: 'Freelancer', sub: 'External pool'  },
];

const TYPE_DOT = {
  FT:         'var(--neon-red)',
  SME:        'var(--neon-purple)',
  WILP:       'var(--wilp)',
  FREELANCER: 'var(--neon-yellow)',
};

const TYPE_LABEL = {
  FT:         'Internal-Fulltime',
  SME:        'Internal-SME',
  WILP:       'Internal-WILP',
  FREELANCER: 'Freelancer',
};

const toIso = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const initials = (name) => (name || '?')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((w) => w[0].toUpperCase())
  .join('');

// Classify a Trainer Data Live cell into a coarse status used for colouring.
const classifyCell = (cell) => {
  const s = (cell || '').trim().toLowerCase();
  if (!s || s === 'not alloted' || s === 'not allocated' || s === 'na' || s === 'n/a') return 'free';
  if (s === 'exit' || s === 'exited' || s === 'left' || s === 'leave' || s === 'on leave') return 'leave';
  if (s.endsWith('-ta') || s.endsWith(' ta') || s.includes(' ta ') || s.includes('internal ta')) return 'ta';
  if (s.includes('backup') || s.includes('back up') || s.includes('back-up')) return 'backup';
  return 'trainer';
};

// Parse the cell into a "Client / Course" pair for the tooltip.
const parseAssignment = (cell) => {
  const raw = (cell || '').trim();
  if (!raw) return { client: '', course: '', role: '' };
  const lower = raw.toLowerCase();
  let role = 'Trainer';
  let body = raw;
  for (const suffix of ['-trainer', '-trainers', '-ta', '-backup', '_trainer']) {
    if (lower.endsWith(suffix)) {
      body = raw.slice(0, -suffix.length);
      role = suffix.includes('ta') ? 'TA' : (suffix.includes('backup') ? 'Backup' : 'Trainer');
      break;
    }
  }
  const parts = body.split('-').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { client: raw, course: '', role };
  if (parts.length === 1) return { client: '', course: parts[0], role };
  return { client: parts[0], course: parts.slice(1).join(' · '), role };
};

export default function Matrix({ active }) {
  const [pool, setPool] = useState('internal');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | free | occupied
  const [poolMenuOpen, setPoolMenuOpen] = useState(false);

  // Pagination state. We track the page (1-indexed for display) and the
  // page-size. The page gets clamped via useEffect whenever the underlying
  // filtered list shrinks so we never render an empty page.
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toIso(today), [today]);

  // ----- Date-range filter (top-centre of the page) ------------------------
  // Pending = what's in the date pickers right now. Committed = the range the
  // matrix is currently rendering. Apply button copies pending → committed
  // (also handled by clicking the picker date directly, see below).
  const defaultStart = useMemo(() => toIso(today), [today]);
  const defaultEnd   = useMemo(
    () => toIso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 29)),
    [today],
  );
  const [pendingStart, setPendingStart] = useState(defaultStart);
  const [pendingEnd,   setPendingEnd]   = useState(defaultEnd);
  const [committedStart, setCommittedStart] = useState(defaultStart);
  const [committedEnd,   setCommittedEnd]   = useState(defaultEnd);

  const days = useMemo(() => {
    const arr = [];
    const [sy, sm, sd] = committedStart.split('-').map(Number);
    const [ey, em, ed] = committedEnd.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end   = new Date(ey, em - 1, ed);
    if (end < start) return arr;
    const cursor = new Date(start);
    while (cursor <= end) {
      arr.push({ iso: toIso(cursor), date: new Date(cursor) });
      cursor.setDate(cursor.getDate() + 1);
      if (arr.length > 366) break; // safety cap
    }
    return arr;
  }, [committedStart, committedEnd]);

  const rangeInvalid = pendingEnd < pendingStart;
  const rangeDirty = pendingStart !== committedStart || pendingEnd !== committedEnd;
  const isDefault = committedStart === defaultStart && committedEnd === defaultEnd;
  const rangeDays = days.length;

  const applyRange = () => {
    if (rangeInvalid) return;
    setCommittedStart(pendingStart);
    setCommittedEnd(pendingEnd);
  };
  const resetRange = () => {
    setPendingStart(defaultStart);
    setPendingEnd(defaultEnd);
    setCommittedStart(defaultStart);
    setCommittedEnd(defaultEnd);
  };

  const { data, error, isLoading, refetch } = useGetTrainersQuery({ limit: 500 });

  const trainers = data?.trainers || [];

  // Filter by selected pool, optional name/id search, and current-status filter.
  const poolFiltered = useMemo(() => {
    return trainers.filter((t) => {
      const isInternal = INTERNAL_TYPES.has(t.type);
      const isFreelancer = t.type === 'FREELANCER';
      if (pool === 'internal' && !isInternal) return false;
      if (pool === 'freelancer' && !isFreelancer) return false;
      return true;
    });
  }, [trainers, pool]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return poolFiltered
      .filter((t) => {
        if (!q) return true;
        return (
          (t.name || '').toLowerCase().includes(q) ||
          (t.employee_id || '').toLowerCase().includes(q) ||
          (t.email || '').toLowerCase().includes(q) ||
          (t.type_raw || '').toLowerCase().includes(q)
        );
      })
      .filter((t) => {
        if (statusFilter === 'all') return true;
        const cell = (t.schedule || {})[todayIso] || '';
        const kind = classifyCell(cell);
        if (statusFilter === 'free') return kind === 'free';
        if (statusFilter === 'occupied') return kind !== 'free' && kind !== 'leave';
        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [poolFiltered, search, statusFilter, todayIso]);

  // Aggregate counts for the header
  const poolCounts = useMemo(() => {
    const internal = trainers.filter((t) => INTERNAL_TYPES.has(t.type)).length;
    const freelancer = trainers.filter((t) => t.type === 'FREELANCER').length;
    return { internal, freelancer };
  }, [trainers]);

  // ----- Pagination derivations ---------------------------------------------
  const totalRows  = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  // Clamp page to [1, totalPages] (handles filter narrowing or page-size change)
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIdx = totalRows === 0 ? 0 : (safePage - 1) * pageSize;
  const endIdx   = Math.min(startIdx + pageSize, totalRows);
  const paged    = useMemo(() => filtered.slice(startIdx, endIdx), [filtered, startIdx, endIdx]);

  // Snap back to page 1 whenever a filter changes — otherwise narrowing the
  // pool while on page 8 would land on an empty page until clamped.
  useEffect(() => { setPage(1); }, [pool, search, statusFilter, committedStart, committedEnd, pageSize]);

  // If state drifted past the new end (e.g. sheet sync removed rows), pull it back.
  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  if (error) return <ErrorPanel panelId="matrix" active={active} error={error?.error || error?.message || 'Failed to load trainers.'} onRetry={() => refetch()} />;
  if (isLoading && !data) return <LoadingPanel panelId="matrix" active={active} />;

  const activePoolMeta = POOLS.find((p) => p.id === pool);

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="matrix">
      {/* Centered date-range filter — drives the matrix columns */}
      <div className="mtx-filter-wrap">
        <div className="mtx-filter">
          <span className="mtx-filter-title">Date range</span>
          <div className="mtx-filter-field">
            <span className="mtx-filter-label">START</span>
            <DatePicker value={pendingStart} onChange={setPendingStart} ariaLabel="Start date" />
          </div>
          <span className="mtx-filter-arrow" aria-hidden="true">→</span>
          <div className="mtx-filter-field">
            <span className="mtx-filter-label">END</span>
            <DatePicker value={pendingEnd} onChange={setPendingEnd} ariaLabel="End date" />
          </div>
          <div className="mtx-filter-meta">
            {rangeInvalid ? (
              <span className="mtx-filter-err">End must be ≥ Start</span>
            ) : (
              <>
                <span className="mtx-filter-window">{rangeDays}d</span>
                {isDefault && <span className="mtx-filter-tag">Default · 30d</span>}
              </>
            )}
          </div>
          <div className="mtx-filter-actions">
            <button
              type="button"
              className="mtx-filter-reset"
              onClick={resetRange}
              disabled={isDefault && !rangeDirty}
              title="Reset to default 30-day window"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Reset
            </button>
            <button
              type="button"
              className="mtx-filter-apply"
              onClick={applyRange}
              disabled={rangeInvalid || !rangeDirty}
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <div className="section-title">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Trainer Matrix · Engagement Grid
            </div>
            <div className="section-sub" style={{ marginTop: '6px' }}>
              {filtered.length} trainer{filtered.length === 1 ? '' : 's'} · {rangeDays}-day allotment from Trainer Data Live · hover any cell for delivery + role
            </div>
          </div>
          <div className="section-actions">
            {/* Pool dropdown */}
            <div className={`mtx-pool${poolMenuOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                className="mtx-pool-trigger"
                onClick={() => setPoolMenuOpen((v) => !v)}
                onBlur={() => setTimeout(() => setPoolMenuOpen(false), 120)}
              >
                <span className="mtx-pool-pill">{pool === 'internal' ? poolCounts.internal : poolCounts.freelancer}</span>
                <span className="mtx-pool-label">{activePoolMeta?.label}</span>
                <span className="mtx-pool-sub">· {activePoolMeta?.sub}</span>
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mtx-pool-caret">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {poolMenuOpen && (
                <div className="mtx-pool-menu">
                  {POOLS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`mtx-pool-opt${pool === p.id ? ' is-active' : ''}`}
                      onMouseDown={(e) => { e.preventDefault(); setPool(p.id); setPoolMenuOpen(false); }}
                    >
                      <span className="mtx-pool-pill">{p.id === 'internal' ? poolCounts.internal : poolCounts.freelancer}</span>
                      <span className="mtx-pool-opt-text">
                        <span className="mtx-pool-opt-label">{p.label}</span>
                        <span className="mtx-pool-opt-sub">{p.sub}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="input-wrap" style={{ width: '220px' }}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="input"
                placeholder="Search trainer / ID / type…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="range-segment">
              <button className={statusFilter === 'all' ? 'active' : ''} onClick={() => setStatusFilter('all')}>All</button>
              <button className={statusFilter === 'free' ? 'active' : ''} onClick={() => setStatusFilter('free')}>Free today</button>
              <button className={statusFilter === 'occupied' ? 'active' : ''} onClick={() => setStatusFilter('occupied')}>Occupied today</button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mtx-legend">
          <span className="mtx-legend-item"><span className="mtx-legend-swatch is-free" /> Free</span>
          <span className="mtx-legend-item"><span className="mtx-legend-swatch is-trainer" /> Trainer</span>
          <span className="mtx-legend-item"><span className="mtx-legend-swatch is-ta" /> TA</span>
          <span className="mtx-legend-item"><span className="mtx-legend-swatch is-backup" /> Backup</span>
          <span className="mtx-legend-item"><span className="mtx-legend-swatch is-leave" /> Leave / Exit</span>
        </div>

        {/* Matrix grid */}
        <div className="mtx-wrap">
          <div className="mtx-grid" style={{ gridTemplateColumns: `220px repeat(${days.length}, minmax(28px, 1fr))` }}>
            {/* Day header row */}
            <div className="mtx-corner">Trainer · Type</div>
            {days.map((d) => {
              const isToday = d.iso === todayIso;
              const weekday = d.date.toLocaleDateString('en-GB', { weekday: 'short' })[0];
              const dayNum = d.date.getDate();
              return (
                <div key={d.iso} className={`mtx-day-head${isToday ? ' is-today' : ''}`} title={d.iso}>
                  <div className="mtx-day-wd">{weekday}</div>
                  <div className="mtx-day-num">{dayNum}</div>
                </div>
              );
            })}

            {/* Trainer rows */}
            {totalRows === 0 ? (
              <div className="mtx-empty" style={{ gridColumn: `1 / span ${days.length + 1}` }}>
                No trainers match the current filters.
              </div>
            ) : (
              paged.map((t) => {
                const schedule = t.schedule || {};
                return (
                  <div key={`${t.employee_id || ''}-${t.name}`} style={{ display: 'contents' }}>
                    <div className="mtx-row-head">
                      <span className="mtx-avatar" style={{ background: TYPE_DOT[t.type] || 'var(--text-muted)' }}>
                        {initials(t.name)}
                      </span>
                      <span className="mtx-row-meta">
                        <span className="mtx-row-name" title={t.name}>{t.name}</span>
                        <span className="mtx-row-sub">
                          <span className="mtx-row-type" style={{ color: TYPE_DOT[t.type] || 'var(--text-muted)' }}>
                            {TYPE_LABEL[t.type] || t.type_raw || 'Unclassified'}
                          </span>
                          {t.employee_id && (
                            <>
                              <span className="mtx-dot-sep">·</span>
                              <span>{t.employee_id}</span>
                            </>
                          )}
                        </span>
                      </span>
                    </div>
                    {days.map((d) => {
                      const cell = schedule[d.iso] || '';
                      const kind = classifyCell(cell);
                      const parsed = kind === 'trainer' || kind === 'ta' || kind === 'backup' ? parseAssignment(cell) : null;
                      const tooltipBits = [d.iso];
                      if (parsed) {
                        if (parsed.client) tooltipBits.push(`Client: ${parsed.client}`);
                        if (parsed.course) tooltipBits.push(`Course: ${parsed.course}`);
                        if (parsed.role) tooltipBits.push(`Role: ${parsed.role}`);
                      } else if (kind === 'free') {
                        tooltipBits.push('Free');
                      } else if (kind === 'leave') {
                        tooltipBits.push('Exit / Leave');
                      }
                      const isToday = d.iso === todayIso;
                      return (
                        <div
                          key={d.iso}
                          className={`mtx-cell is-${kind}${isToday ? ' is-today' : ''}`}
                          title={tooltipBits.join(' · ')}
                        />
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination — keeps the matrix scannable when the filtered list is
            long. Hidden when there are zero rows; controls auto-disable at
            the boundaries. */}
        {totalRows > 0 && (
          <div className="mtx-pager" role="navigation" aria-label="Trainer matrix pagination">
            <div className="mtx-pager-status">
              Showing <strong>{startIdx + 1}</strong>–<strong>{endIdx}</strong> of <strong>{totalRows}</strong> trainer{totalRows === 1 ? '' : 's'}
            </div>

            <div className="mtx-pager-size">
              <label htmlFor="mtx-page-size">Rows / page</label>
              <select
                id="mtx-page-size"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="mtx-pager-nav">
              <button
                type="button"
                className="mtx-pager-btn"
                onClick={() => setPage(1)}
                disabled={safePage <= 1}
                aria-label="First page"
                title="First page"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="11 17 6 12 11 7" />
                  <polyline points="18 17 13 12 18 7" />
                </svg>
              </button>
              <button
                type="button"
                className="mtx-pager-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                aria-label="Previous page"
                title="Previous page"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Prev
              </button>

              <span className="mtx-pager-page">
                Page <strong>{safePage}</strong> <span className="mtx-pager-of">of</span> <strong>{totalPages}</strong>
              </span>

              <button
                type="button"
                className="mtx-pager-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                aria-label="Next page"
                title="Next page"
              >
                Next
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button
                type="button"
                className="mtx-pager-btn"
                onClick={() => setPage(totalPages)}
                disabled={safePage >= totalPages}
                aria-label="Last page"
                title="Last page"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="13 17 18 12 13 7" />
                  <polyline points="6 17 11 12 6 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
