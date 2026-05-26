import { useMemo, useState } from 'react';
import { useGetRequestTrackQuery } from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';

/* ============================================================
   ALL REQUIREMENTS · table view
   ------------------------------------------------------------
   Live tabular view of every row in the Request ID Track sheet
   with status / search / type filters and a TABLE / GANTT
   toggle. Source: useGetRequestTrackQuery (single shared cache,
   identical to the Pending Allocations page).
   ============================================================ */

const parseNum = (v) => {
  if (v == null || v === '') return 0;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

// Excel stores dates as days-since 1899-12-30. The sheet sometimes ships ISO
// strings instead (when the cell has been retyped manually). Handle both.
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const MONTHS_3 = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

function parseSheetDate(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return new Date(EXCEL_EPOCH + raw * 86400000);
  }
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) {
    return new Date(EXCEL_EPOCH + Number(s) * 86400000);
  }
  // "1/6/2025", "1-Jun-2025", "01-06-2025"
  const m = s.match(/^(\d{1,2})[\s\-/](\d{1,2}|[A-Za-z]{3,9})[\s\-/](\d{2,4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    let month;
    if (/^\d+$/.test(m[2])) month = parseInt(m[2], 10) - 1;
    else month = MONTHS_3.findIndex((mm) => m[2].toLowerCase().startsWith(mm));
    if (month < 0) return null;
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    return new Date(Date.UTC(year, month, day));
  }
  const ts = Date.parse(s);
  return Number.isFinite(ts) ? new Date(ts) : null;
}

function fmtShort(d) {
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// INTERNAL / FREELANCER / MIXED  — derived from headcount columns. A row with
// any freelancer headcount AND any internal becomes MIXED; otherwise it leans
// toward whichever pool actually has people. Empty rows default to INTERNAL.
function deriveType(row) {
  const internal = parseNum(row['Internal']);
  const fl =
    parseNum(row['Existing Freelancers']) +
    parseNum(row['New Freelancers Hired']) +
    parseNum(row['New Freelancer Required']);
  if (internal > 0 && fl > 0) return 'MIXED';
  if (fl > 0 && internal === 0) return 'FREELANCER';
  return 'INTERNAL';
}

// OPEN / CLOSED / CANCELLED — interpret the live Allocation/Training Status
// text. Cancellation wins; "closed"/"complete" maps to CLOSED; everything
// else is OPEN.
function deriveStatus(row) {
  const a = String(row['Allocation Status'] || '').toLowerCase();
  const t = String(row['Training Status'] || '').toLowerCase();
  if (/cancel|drop/.test(a) || /cancel|drop/.test(t)) return 'CANCELLED';
  if (/closed?|complete/.test(a) || /closed?|complete/.test(t)) return 'CLOSED';
  return 'OPEN';
}

function summarise(row) {
  const trainerReq = parseNum(row['Total Trainer Required']);
  const taReq      = parseNum(row["Total TA's Required"]);
  const required   = trainerReq + taReq;
  const internal   = parseNum(row['Internal']);
  const fl =
    parseNum(row['Existing Freelancers']) +
    parseNum(row['New Freelancers Hired']);
  const filled = internal + fl;
  const gap    = Math.max(0, required - filled);
  return { trainerReq, taReq, required, filled, gap };
}

// Numeric Risk taken from the sheet's Risk column when populated; otherwise
// fall back to the gap (so unallocated demand still surfaces as a risk score).
function deriveRisk(row, gap) {
  const cell = String(row['Risk'] || '').trim();
  const explicit = parseInt(cell.replace(/[^\d]/g, ''), 10);
  if (Number.isFinite(explicit) && /\d/.test(cell)) return explicit;
  return gap;
}

const riskTone = (risk) => (risk >= 10 ? 'high' : risk >= 4 ? 'med' : risk > 0 ? 'low' : 'none');
const STATUS_TONE = { OPEN: 'open', CLOSED: 'closed', CANCELLED: 'cancelled' };
const TYPE_TONE   = { INTERNAL: 'internal', FREELANCER: 'freelancer', MIXED: 'mixed' };

// "Window" cell: short date range. Falls back gracefully when only one side
// of the range is present in the sheet.
function windowLabel(start, end) {
  if (start && end) return `${fmtShort(start)} → ${fmtShort(end)}`;
  if (start) return `from ${fmtShort(start)}`;
  if (end)   return `until ${fmtShort(end)}`;
  return '—';
}

const STATUS_FILTERS = ['ALL', 'OPEN', 'CLOSED', 'CANCELLED'];

export default function Requirements({ active }) {
  const { data, error, isLoading, refetch } = useGetRequestTrackQuery({ limit: 500 });
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [view, setView]                 = useState('TABLE');

  // ----- Normalise live rows -------------------------------------------------
  const rows = useMemo(() => {
    const raw = data?.rows || [];
    const now = new Date();
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return raw
      .map((row) => {
        const summary = summarise(row);
        const start = parseSheetDate(row['Program Start Date']);
        const end   = parseSheetDate(row['Program End Date']);
        const risk  = deriveRisk(row, summary.gap);
        const archived = end != null && end.getTime() < todayUtc;
        return {
          delivery_id: String(row['Delivery ID'] || '').trim(),
          client:      String(row['Client Name'] || '').trim(),
          course:      String(row['Course'] || '').trim(),
          domain:      String(row['Domain'] || '').trim(),
          subdomain:   String(row['Subdomain'] || '').trim(),
          start, end,
          type:   deriveType(row),
          status: deriveStatus(row),
          ta_required: summary.taReq,
          trainer_required: summary.trainerReq,
          required: summary.required,
          gap: summary.gap,
          risk,
          archived,
          raw: row,
        };
      })
      // Drop wholly-empty rows that come through as padding
      .filter((r) => r.delivery_id || r.client || r.course);
  }, [data]);

  // Counts — active = end_date >= today (or no end date); archived = past.
  const stats = useMemo(() => ({
    active:   rows.filter((r) => !r.archived).length,
    archived: rows.filter((r) =>  r.archived).length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.delivery_id.toLowerCase().includes(q) ||
        r.client.toLowerCase().includes(q) ||
        r.course.toLowerCase().includes(q) ||
        r.domain.toLowerCase().includes(q) ||
        r.subdomain.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  if (error) {
    return (
      <ErrorPanel
        panelId="requirements"
        active={active}
        error={error?.error || error?.message || 'Failed to load requirements.'}
        onRetry={() => refetch()}
      />
    );
  }
  if (isLoading && !data) return <LoadingPanel panelId="requirements" active={active} />;

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="requirements">
      <div className="card ar-card">
        <header className="ar-head">
          <div className="ar-head-left">
            <h2 className="ar-title">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8"  y1="13" x2="16" y2="13" />
                <line x1="8"  y1="17" x2="13" y2="17" />
              </svg>
              ALL REQUIREMENTS
            </h2>
            <div className="ar-subtitle">
              <strong>{stats.active}</strong> active <span className="ar-dot">·</span> <strong>{stats.archived}</strong> archived
            </div>
          </div>

          <div className="ar-head-right">
            <div className="ar-search-wrap">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                className="ar-search"
                placeholder="Search Delivery ID, client, programme…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="ar-search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >×</button>
              )}
            </div>

            <div className="ar-filters" role="tablist" aria-label="Status filter">
              {STATUS_FILTERS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === opt}
                  className={`ar-filter-btn${statusFilter === opt ? ' is-active' : ''}`}
                  onClick={() => setStatusFilter(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="ar-views" role="tablist" aria-label="View mode">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'TABLE'}
                className={`ar-view-btn${view === 'TABLE' ? ' is-active' : ''}`}
                onClick={() => setView('TABLE')}
              >TABLE</button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'GANTT'}
                className={`ar-view-btn${view === 'GANTT' ? ' is-active' : ''}`}
                onClick={() => setView('GANTT')}
              >GANTT</button>
            </div>
          </div>
        </header>

        {view === 'TABLE' ? (
          <RequirementsTable rows={filtered} totalRows={rows.length} />
        ) : (
          <div className="ar-gantt-empty">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3"  y="5"  width="10" height="3" rx="1" />
              <rect x="7"  y="11" width="12" height="3" rx="1" />
              <rect x="5"  y="17" width="8"  height="3" rx="1" />
            </svg>
            <div className="ar-gantt-title">Gantt view coming soon</div>
            <div className="ar-gantt-sub">Switch back to <button className="ar-link" onClick={() => setView('TABLE')}>TABLE</button> for the full list.</div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ----- table ----- */

function RequirementsTable({ rows, totalRows }) {
  if (totalRows === 0) {
    return (
      <div className="ar-empty">
        <div className="ar-empty-title">No requirements found</div>
        <div className="ar-empty-sub">The Request ID Track sheet returned no rows.</div>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="ar-empty">
        <div className="ar-empty-title">No matches</div>
        <div className="ar-empty-sub">Nothing matches the current filter and search.</div>
      </div>
    );
  }
  return (
    <div className="ar-table-wrap" role="region" aria-label="Requirements table">
      <table className="ar-table">
        <thead>
          <tr>
            <th className="ar-th-bar" aria-label="status" />
            <th>Delivery ID</th>
            <th>Course / Client</th>
            <th>Window</th>
            <th>Type</th>
            <th className="ar-th-num">TAs</th>
            <th className="ar-th-num">Gap</th>
            <th className="ar-th-num">Risk</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => <RequirementsRow key={`${r.delivery_id}-${idx}`} row={r} />)}
        </tbody>
      </table>
      <div className="ar-table-foot">
        Showing <strong>{rows.length}</strong> of <strong>{totalRows}</strong> requirement{totalRows === 1 ? '' : 's'}
      </div>
    </div>
  );
}

function RequirementsRow({ row }) {
  const tone = riskTone(row.risk);
  const riskNum = row.risk > 0 ? row.risk : '—';
  const riskLabel = tone === 'high' ? 'HIGH' : tone === 'med' ? 'MED' : tone === 'low' ? 'LOW' : '';

  // Subtitle: "Client · Domain[ · Subdomain]" – never start with an orphan dot.
  const subBits = [row.client, row.domain, row.subdomain].filter(Boolean);
  const subtitle = subBits.join(' · ');

  return (
    <tr className={`ar-row ar-row-${tone}${row.archived ? ' is-archived' : ''}`}>
      <td className="ar-cell-bar" aria-hidden="true">
        <span className={`ar-bar is-${tone}`} />
      </td>

      <td className="ar-cell-id">
        <span className="ar-id" title={row.delivery_id || '—'}>{row.delivery_id || '—'}</span>
      </td>

      <td className="ar-cell-window">
        <div className="ar-window-title" title={row.course || '—'}>
          {row.course || row.client || '—'}
        </div>
        {subtitle && (
          <div className="ar-window-sub" title={subtitle}>{subtitle}</div>
        )}
      </td>

      <td className="ar-cell-when">
        <span className="ar-when">{windowLabel(row.start, row.end)}</span>
      </td>

      <td>
        <span className={`ar-chip ar-chip-${TYPE_TONE[row.type] || 'internal'}`}>{row.type}</span>
      </td>

      <td className="ar-cell-num">
        <span className="ar-num">{row.ta_required > 0 ? row.ta_required : '—'}</span>
      </td>

      <td className="ar-cell-num">
        <span className={`ar-num${row.gap > 0 ? ' is-warn' : ''}`}>
          {row.gap > 0 ? row.gap : '—'}
        </span>
      </td>

      <td className="ar-cell-num">
        <span className="ar-risk-group">
          <span className={`ar-num ar-num-risk-${tone}`}>{riskNum}</span>
          {riskLabel && (
            <span className={`ar-chip ar-chip-risk-${tone}`}>
              <span className="ar-dot-mark" />
              {riskLabel}
            </span>
          )}
        </span>
      </td>

      <td>
        <span className={`ar-chip ar-chip-status-${STATUS_TONE[row.status]}`}>
          <span className="ar-dot-mark" />
          {row.status}
        </span>
      </td>
    </tr>
  );
}
