import { useState, useMemo } from 'react';
import { useGetRequestTrackQuery } from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';

/* ============================================================
   Pending Allocations
   ------------------------------------------------------------
   Source: Request ID Track sheet (live, read-only via Graph).
   For each requirement we compute:
     - required = Total Trainer Required + Total TAs Required
     - internal_filled = "Internal" column (combined trainers + TAs
                         the planner already booked from the internal pool)
     - freelancer_filled = Existing Freelancers + New Freelancers Hired
     - gap = max(0, required - internal_filled - freelancer_filled)
   Status:
     * Completed (Internal) — gap == 0 and 0 freelancers needed
     * Completed (Mixed)    — gap == 0 with both internal + freelancer
     * Completed (FL)       — gap == 0 with 0 internal (e.g. pure freelancer ask)
     * Pending              — gap > 0, planner still needs to fill it
   ============================================================ */

// ---- Excel date / number helpers -------------------------------------------
const parseNum = (v) => {
  if (v == null || v === '' || typeof v !== 'string' && typeof v !== 'number') return 0;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

const excelSerialToDate = (val) => {
  if (val == null || val === '') return null;
  // Already an ISO-ish string?
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return new Date(val);
  const n = typeof val === 'number' ? val : parseInt(String(val).trim(), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  // Excel epoch: Dec 30 1899 (accounts for the 1900 leap-year bug).
  return new Date(Date.UTC(1899, 11, 30) + n * 86400000);
};

const fmtDate = (val) => {
  const d = excelSerialToDate(val);
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const daysUntil = (val) => {
  const d = excelSerialToDate(val);
  if (!d || isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
};

// ---- Row → fulfilment summary ---------------------------------------------
function summariseRow(row) {
  const trainerReq = parseNum(row['Total Trainer Required']);
  const taReq      = parseNum(row["Total TA's Required"]);
  const required   = trainerReq + taReq;

  const internal     = parseNum(row['Internal']);
  const existingFL   = parseNum(row['Existing Freelancers']);
  const newFLHired   = parseNum(row['New Freelancers Hired']);
  const newFLReq     = parseNum(row['New Freelancer Required']);
  const freelancer   = existingFL + newFLHired;

  const filled = internal + freelancer;
  const gap    = Math.max(0, required - filled);

  // Status — informed by both the computed gap and the sheet's Allocation Status.
  const allocationStatus = String(row['Allocation Status'] || '').toLowerCase().trim();
  const sheetSaysClosed = allocationStatus === 'closed' || allocationStatus === 'completed';

  let status, tone;
  if (gap === 0 && required > 0) {
    if (freelancer === 0 && internal > 0) {
      status = 'Completed · Internal';
      tone = 'ok';
    } else if (internal === 0 && freelancer > 0) {
      status = 'Completed · Freelancer';
      tone = 'ok-fl';
    } else if (internal > 0 && freelancer > 0) {
      status = 'Completed · Mixed';
      tone = 'ok-mix';
    } else {
      status = sheetSaysClosed ? 'Completed' : 'Pending';
      tone = sheetSaysClosed ? 'ok' : 'pending';
    }
  } else if (required === 0) {
    status = 'No demand';
    tone = 'neutral';
  } else {
    status = 'Pending';
    tone = 'pending';
  }

  // Suggestion: where should the planner act next?
  let nextAction = null;
  if (gap > 0) {
    if (internal < trainerReq + taReq && freelancer === 0) {
      nextAction = `Plan ${gap} more from Internal pool`;
    } else {
      nextAction = `Move ${gap} to Freelancer pool`;
    }
  }

  return {
    delivery_id: row['Delivery ID'] || '—',
    client:      row['Client Name'] || '—',
    course:      row['Course']      || '',
    domain:      row['Domain']      || '',
    subdomain:   row['Subdomain']   || '',
    requirementType: row['Requirement Type'] || '',
    start:  row['Program Start Date'],
    end:    row['Program End Date'],
    onboarding: row['Onboarding date'],
    risk:  row['Risk'] || '',
    sheetAllocationStatus: row['Allocation Status'] || '',
    sheetTrainingStatus:   row['Training Status']   || '',
    trainerPlanned: row['Trainer planned'] || '',
    taPlanned:      row['TA Planned']      || '',
    trainerReq,
    taReq,
    required,
    internal,
    existingFL,
    newFLHired,
    newFLReq,
    freelancer,
    filled,
    gap,
    status,
    tone,
    nextAction,
  };
}

// ---- Status filter pills ---------------------------------------------------
const STATUS_FILTERS = [
  { id: 'all',       label: 'All' },
  { id: 'pending',   label: 'Pending' },
  { id: 'completed', label: 'Completed' },
];

const statusGroup = (tone) => {
  if (tone === 'pending') return 'pending';
  if (tone === 'neutral') return 'neutral';
  return 'completed';
};

// ============================================================================
export default function Pending({ active }) {
  const { data, error, refetch, isLoading } =
    useGetRequestTrackQuery({ limit: 500 });

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    return (data?.rows || []).map(summariseRow);
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        // skip rows with no demand & no delivery id (junk rows)
        if (r.required === 0 && r.delivery_id === '—') return false;
        // status filter
        if (filter !== 'all' && statusGroup(r.tone) !== filter) return false;
        // search
        if (!q) return true;
        return (
          r.delivery_id.toLowerCase().includes(q) ||
          r.client.toLowerCase().includes(q) ||
          r.course.toLowerCase().includes(q) ||
          r.domain.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // pending first, then by start date asc
        const aPending = a.tone === 'pending' ? 0 : 1;
        const bPending = b.tone === 'pending' ? 0 : 1;
        if (aPending !== bPending) return aPending - bPending;
        const aD = excelSerialToDate(a.start)?.getTime() || 0;
        const bD = excelSerialToDate(b.start)?.getTime() || 0;
        return aD - bD;
      });
  }, [rows, filter, search]);

  // ---- Counts for KPI strip
  const kpis = useMemo(() => {
    const pending = rows.filter((r) => r.tone === 'pending');
    const completed = rows.filter((r) => r.tone.startsWith('ok'));
    const internalOnly = rows.filter((r) => r.tone === 'ok');
    const mixed = rows.filter((r) => r.tone === 'ok-mix' || r.tone === 'ok-fl');
    const totalGap = pending.reduce((s, r) => s + r.gap, 0);
    const totalDemand = rows.reduce((s, r) => s + r.required, 0);
    return {
      pendingCount: pending.length,
      completedCount: completed.length,
      internalOnlyCount: internalOnly.length,
      mixedCount: mixed.length,
      totalGap,
      totalDemand,
    };
  }, [rows]);

  if (error) {
    return <ErrorPanel panelId="pending" active={active} error={error?.error || error?.message || 'Unknown error'} onRetry={() => refetch()} />;
  }
  if (isLoading && !data) {
    return <LoadingPanel panelId="pending" active={active} />;
  }

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="pending">
      <div className="callout" style={{ marginBottom: '14px' }}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        <div className="callout-title">Internal-first allocation</div>
        <div className="callout-body">
          Every requirement is rated by its fulfilment from the live <strong>Request ID Track</strong> sheet.
          A requirement is <strong>Completed</strong> only when the combined Internal + Freelancer headcount meets the demand.
          Anything else is <strong>Pending</strong> — see the gap and the suggested next action.
        </div>
      </div>

      {/* KPI strip */}
      <div className="pa-strip">
        <div className="pa-stat pa-stat-pending">
          <div className="pa-stat-val">{kpis.pendingCount}</div>
          <div className="pa-stat-key">Pending</div>
          <div className="pa-stat-sub">{kpis.totalGap} unfilled slots</div>
        </div>
        <div className="pa-stat pa-stat-ok">
          <div className="pa-stat-val">{kpis.completedCount}</div>
          <div className="pa-stat-key">Completed</div>
          <div className="pa-stat-sub">{kpis.internalOnlyCount} internal · {kpis.mixedCount} mixed/FL</div>
        </div>
        <div className="pa-stat">
          <div className="pa-stat-val">{kpis.totalDemand}</div>
          <div className="pa-stat-key">Total demand</div>
          <div className="pa-stat-sub">across {rows.length} requirements</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="pa-toolbar">
        <div className="pa-toolbar-left">
          <div className="range-segment">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                className={filter === f.id ? 'active' : ''}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="input-wrap" style={{ width: '260px' }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="input"
            placeholder="Search delivery / client / course…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="pa-empty">No requirements match the current filter.</div>
      ) : (
        <div className="pa-list">
          {filtered.map((r) => (
            <RequirementCard key={r.delivery_id + r.course} row={r} />
          ))}
        </div>
      )}
    </section>
  );
}

// ----------------------------------------------------------------------------
function RequirementCard({ row }) {
  const d = daysUntil(row.start);
  const dayChip = d == null
    ? null
    : d < 0
      ? `${Math.abs(d)}d ago`
      : d === 0
        ? 'Starts today'
        : `Starts in ${d}d`;
  const isUrgent = d != null && d >= 0 && d <= 7 && row.tone === 'pending';

  // Per-role progress bars (use combined internal+FL vs total required)
  const requiredPct = row.required === 0 ? 0 : Math.min(100, (row.filled / row.required) * 100);

  return (
    <div className={`pa-card pa-tone-${row.tone}${isUrgent ? ' is-urgent' : ''}`}>
      {/* Card head: id, client, status badge */}
      <div className="pa-head">
        <div className="pa-head-left">
          <div className="pa-id">{row.delivery_id}</div>
          <div className="pa-course" title={row.course}>{row.course || '—'}</div>
          <div className="pa-meta">
            <span className="pa-meta-tag pa-client">{row.client}</span>
            {row.domain && <span className="pa-meta-tag">{row.domain}{row.subdomain ? ` · ${row.subdomain}` : ''}</span>}
            {row.requirementType && (
              <span className={`pa-meta-tag${row.requirementType.toLowerCase() === 'internal' ? ' is-internal' : ' is-fl'}`}>
                {row.requirementType}
              </span>
            )}
          </div>
        </div>
        <div className="pa-head-right">
          <span className={`pa-status pa-status-${row.tone}`}>
            <span className="pa-status-dot" />
            {row.status}
          </span>
          {dayChip && (
            <span className={`pa-day-chip${isUrgent ? ' is-urgent' : ''}`}>{dayChip}</span>
          )}
        </div>
      </div>

      {/* Body: demand vs allocation */}
      <div className="pa-body">
        <div className="pa-need">
          <div className="pa-need-row">
            <span className="pa-need-key">Trainer demand</span>
            <span className="pa-need-val">{row.trainerReq}</span>
          </div>
          <div className="pa-need-row">
            <span className="pa-need-key">TA demand</span>
            <span className="pa-need-val">{row.taReq}</span>
          </div>
          <div className="pa-need-row pa-need-row-total">
            <span className="pa-need-key">Total required</span>
            <span className="pa-need-val">{row.required}</span>
          </div>
        </div>

        <div className="pa-progress">
          <div className="pa-progress-head">
            <span>Filled <strong>{row.filled}</strong> / {row.required}</span>
            <span className="pa-progress-pct">{requiredPct.toFixed(0)}%</span>
          </div>
          <div className="pa-progress-bar">
            <div
              className="pa-progress-fill pa-progress-fill-int"
              style={{ width: `${row.required ? (row.internal / row.required) * 100 : 0}%` }}
              title={`Internal: ${row.internal}`}
            />
            <div
              className="pa-progress-fill pa-progress-fill-fl"
              style={{ width: `${row.required ? (row.freelancer / row.required) * 100 : 0}%` }}
              title={`Freelancer: ${row.freelancer}`}
            />
          </div>
          <div className="pa-progress-legend">
            <span><span className="dot pa-progress-fill-int" /> Internal: <strong>{row.internal}</strong></span>
            <span><span className="dot pa-progress-fill-fl" /> Freelancer: <strong>{row.freelancer}</strong></span>
            {row.gap > 0 && (
              <span className="pa-progress-gap">Gap: <strong>{row.gap}</strong></span>
            )}
          </div>
        </div>
      </div>

      {/* Footer: dates + planned + next action */}
      <div className="pa-foot">
        <div className="pa-foot-dates">
          <span>{fmtDate(row.start)} → {fmtDate(row.end)}</span>
          {row.onboarding && <span className="pa-foot-onb">Onboarding: {fmtDate(row.onboarding)}</span>}
        </div>
        {(row.trainerPlanned || row.taPlanned) && (
          <div className="pa-foot-planned">
            {row.trainerPlanned && (
              <span className="pa-planned" title={`Trainer planned: ${row.trainerPlanned}`}>
                T · {row.trainerPlanned}
              </span>
            )}
            {row.taPlanned && (
              <span className="pa-planned" title={`TA planned: ${row.taPlanned}`}>
                TA · {row.taPlanned}
              </span>
            )}
          </div>
        )}
        {row.nextAction && (
          <div className="pa-next-action">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
            {row.nextAction}
          </div>
        )}
      </div>
    </div>
  );
}
