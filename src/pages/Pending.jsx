import { useState, useMemo, useEffect } from 'react';
import { useGetRequestTrackQuery } from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';
import RequirementModal from '../components/RequirementModal.jsx';
import ExportButton from '../components/ExportButton.jsx';
import { buildRequirementRow } from '../lib/req.js';
import { exportToExcel } from '../lib/exportExcel.js';

/* ============================================================
   Pending Allocations — Excel-style table
   ------------------------------------------------------------
   Source: Request ID Track sheet (live, read-only via Graph).

   For each requirement we compute:
     required          = Total Trainer Required + Total TAs Required
     internal_filled   = "Internal" column
     freelancer_filled = Existing Freelancers + New Freelancers Hired
     gap               = max(0, required - internal_filled - freelancer_filled)

   The page presents a single sortable, filterable, paginated table —
   the user runs a real spreadsheet view across the live data instead of
   the previous card stack. Clicking a row drills into the shared
   RequirementModal so the inspector is identical to Requirements.
   ============================================================ */

// ---- Excel date / number helpers -------------------------------------------
const parseNum = (v) => {
  if (v == null || v === '') return 0;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

const excelSerialToDate = (val) => {
  if (val == null || val === '') return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return new Date(val);
  const n = typeof val === 'number' ? val : parseInt(String(val).trim(), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return new Date(Date.UTC(1899, 11, 30) + n * 86400000);
};

const fmtDate = (val) => {
  const d = excelSerialToDate(val);
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ---- Row summary -----------------------------------------------------------
function summariseRow(row) {
  const trainerReq = parseNum(row['Total Trainer Required']);
  const taReq      = parseNum(row["Total TA's Required"]);
  const required   = trainerReq + taReq;

  const internal     = parseNum(row['Internal']);
  const existingFL   = parseNum(row['Existing Freelancers']);
  const newFLHired   = parseNum(row['New Freelancers Hired']);
  const freelancer   = existingFL + newFLHired;

  const filled = internal + freelancer;
  const gap    = Math.max(0, required - filled);

  const allocationStatus = String(row['Allocation Status'] || '').toLowerCase().trim();
  const sheetSaysClosed = allocationStatus === 'closed' || allocationStatus === 'completed';

  let status, tone;
  if (gap === 0 && required > 0) {
    if (freelancer === 0 && internal > 0)       { status = 'Completed · Internal';    tone = 'ok'; }
    else if (internal === 0 && freelancer > 0)  { status = 'Completed · Freelancer';  tone = 'ok-fl'; }
    else if (internal > 0 && freelancer > 0)    { status = 'Completed · Mixed';       tone = 'ok-mix'; }
    else { status = sheetSaysClosed ? 'Completed' : 'Pending'; tone = sheetSaysClosed ? 'ok' : 'pending'; }
  } else if (required === 0) {
    status = 'No demand'; tone = 'neutral';
  } else {
    status = 'Pending'; tone = 'pending';
  }

  return {
    delivery_id: String(row['Delivery ID'] || '').trim(),
    client:      String(row['Client Name'] || '').trim(),
    course:      String(row['Course']      || '').trim(),
    domain:      String(row['Domain']      || '').trim(),
    subdomain:   String(row['Subdomain']   || '').trim(),
    requirementType: String(row['Requirement Type'] || '').trim(),
    start:  row['Program Start Date'],
    end:    row['Program End Date'],
    onboarding: row['Onboarding date'],
    trainerReq,
    taReq,
    required,
    internal,
    freelancer,
    filled,
    gap,
    status,
    tone,
    raw: row,
  };
}

// Status filter is driven by the clickable KPI tiles ("Pending" / "Completed"
// / "Total demand" = all) — no separate chip group needed.
const TYPE_OPTIONS = ['INTERNAL', 'FREELANCER', 'MIXED'];

const statusGroup = (tone) => {
  if (tone === 'pending') return 'pending';
  if (tone === 'neutral') return 'neutral';
  return 'completed';
};

const PAGE_SIZES = [25, 50, 100];

// ============================================================================
export default function Pending({ active }) {
  const { data, error, refetch, isLoading } = useGetRequestTrackQuery({ limit: 500 });

  const [statusF, setStatusF]   = useState('all');
  const [search, setSearch]     = useState('');
  const [clientF, setClientF]   = useState('');
  const [domainF, setDomainF]   = useState('');
  const [typeF, setTypeF]       = useState('');
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy]     = useState('start');
  const [sortDir, setSortDir]   = useState('asc');
  const [selected, setSelected] = useState(null);

  const rows = useMemo(() => (data?.rows || []).map(summariseRow), [data]);

  // Distinct option lists for the dropdowns
  const opts = useMemo(() => {
    const c = new Set(), d = new Set();
    for (const r of rows) {
      if (r.client) c.add(r.client);
      if (r.domain) d.add(r.domain);
    }
    const sort = (s) => Array.from(s).sort((a, b) => a.localeCompare(b));
    return { clients: sort(c), domains: sort(d) };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (r.required === 0 && !r.delivery_id) return false; // junk
      if (statusF !== 'all' && statusGroup(r.tone) !== statusF) return false;
      if (clientF && r.client !== clientF) return false;
      if (domainF && r.domain !== domainF) return false;
      if (typeF) {
        const t = r.requirementType.toUpperCase();
        if (typeF === 'INTERNAL'   && !/internal/i.test(r.requirementType)) return false;
        if (typeF === 'FREELANCER' && !/freelanc/i.test(r.requirementType)) return false;
        if (typeF === 'MIXED'      && !/mixed/i.test(r.requirementType))    return false;
        if (typeF === 'INTERNAL'   && t === '') return false;
      }
      if (!q) return true;
      return (
        r.delivery_id.toLowerCase().includes(q) ||
        r.client.toLowerCase().includes(q) ||
        r.course.toLowerCase().includes(q) ||
        r.domain.toLowerCase().includes(q) ||
        r.subdomain.toLowerCase().includes(q)
      );
    });
  }, [rows, statusF, search, clientF, domainF, typeF]);

  const sorted = useMemo(() => {
    const SORT_KEYS = {
      delivery_id: (r) => r.delivery_id.toLowerCase(),
      course:      (r) => (r.course || r.client || '').toLowerCase(),
      client:      (r) => r.client.toLowerCase(),
      start:       (r) => excelSerialToDate(r.start)?.getTime() ?? Number.POSITIVE_INFINITY,
      end:         (r) => excelSerialToDate(r.end)?.getTime() ?? Number.POSITIVE_INFINITY,
      demand:      (r) => r.required,
      filled:      (r) => r.filled,
      gap:         (r) => r.gap,
      type:        (r) => r.requirementType.toLowerCase(),
      status:      (r) => r.status,
      onboarding:  (r) => excelSerialToDate(r.onboarding)?.getTime() ?? Number.POSITIVE_INFINITY,
    };
    const key = SORT_KEYS[sortBy];
    if (!key) return filtered;
    const factor = sortDir === 'desc' ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const av = key(a), bv = key(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      return String(av).localeCompare(String(bv)) * factor;
    });
  }, [filtered, sortBy, sortDir]);

  const handleSort = (col) => {
    if (sortBy !== col) { setSortBy(col); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortBy(null); setSortDir('asc'); }
  };

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, statusF, clientF, domainF, typeF, pageSize]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage  = Math.min(page, pageCount);
  const startIdx  = (safePage - 1) * pageSize;
  const visible   = sorted.slice(startIdx, startIdx + pageSize);
  const rangeStart = sorted.length ? startIdx + 1 : 0;
  const rangeEnd   = startIdx + visible.length;

  const anyFilter = !!(statusF !== 'all' || search || clientF || domainF || typeF || sortBy);
  const resetAll = () => {
    setStatusF('all'); setSearch(''); setClientF(''); setDomainF(''); setTypeF('');
    setSortBy('start'); setSortDir('asc');
  };

  // KPI counts
  const kpis = useMemo(() => {
    const pending = rows.filter((r) => r.tone === 'pending');
    const completed = rows.filter((r) => r.tone.startsWith('ok'));
    const totalGap = pending.reduce((s, r) => s + r.gap, 0);
    const totalDemand = rows.reduce((s, r) => s + r.required, 0);
    return {
      pendingCount: pending.length,
      completedCount: completed.length,
      totalGap,
      totalDemand,
      totalRows: rows.length,
    };
  }, [rows]);

  const handleExport = () => {
    if (!sorted.length) return;
    exportToExcel({
      filename: 'pending-allocations',
      sheets: [{
        name: 'Pending',
        columns: [
          { header: 'Delivery ID',    key: 'delivery_id' },
          { header: 'Course',         key: 'course' },
          { header: 'Client',         key: 'client' },
          { header: 'Domain',         key: 'domain' },
          { header: 'Subdomain',      key: 'subdomain' },
          { header: 'Type',           key: 'requirementType' },
          { header: 'Start Date',     value: (r) => fmtDate(r.start) },
          { header: 'End Date',       value: (r) => fmtDate(r.end) },
          { header: 'Onboarding',     value: (r) => fmtDate(r.onboarding) },
          { header: 'Trainer Demand', key: 'trainerReq' },
          { header: 'TA Demand',      key: 'taReq' },
          { header: 'Total Required', key: 'required' },
          { header: 'Internal',       key: 'internal' },
          { header: 'Freelancer',     key: 'freelancer' },
          { header: 'Filled',         key: 'filled' },
          { header: 'Gap',            key: 'gap' },
          { header: 'Status',         key: 'status' },
        ],
        rows: sorted,
      }],
    });
  };

  if (error) {
    return <ErrorPanel panelId="pending" active={active} error={error?.error || error?.message || 'Unknown error'} onRetry={() => refetch()} />;
  }
  if (isLoading && !data) {
    return <LoadingPanel panelId="pending" active={active} />;
  }

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="pending">
      <div className="card pa-card">
        {/* ---- Header ---- */}
        <header className="rq-head">
          <div className="rq-head-left">
            <div className="rq-subtitle">
              <strong>{kpis.pendingCount}</strong> pending
              <span className="rq-dot">·</span>
              <strong>{kpis.completedCount}</strong> completed
              <span className="rq-dot">·</span>
              <strong>{kpis.totalGap}</strong> open slots
            </div>
          </div>
          <div className="rq-head-right">
            <div className="rq-search-wrap">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="search" className="rq-search" placeholder="Search delivery / client / course / domain…" value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && <button type="button" className="rq-search-clear" onClick={() => setSearch('')} aria-label="Clear">×</button>}
            </div>
            <ExportButton onClick={handleExport} disabled={!sorted.length} label={`Export (${sorted.length})`} />
          </div>
        </header>

        {/* ---- KPI strip (each tile doubles as a status filter) ---- */}
        <div className="pa-strip">
          <button
            type="button"
            className={`pa-stat pa-stat-pending${statusF === 'pending' ? ' is-active' : ''}`}
            aria-pressed={statusF === 'pending'}
            onClick={() => setStatusF(statusF === 'pending' ? 'all' : 'pending')}
            title="Filter to Pending requirements"
          >
            <div className="pa-stat-val">{kpis.pendingCount}</div>
            <div className="pa-stat-key">Pending</div>
            <div className="pa-stat-sub">{kpis.totalGap} unfilled slots</div>
          </button>
          <button
            type="button"
            className={`pa-stat pa-stat-ok${statusF === 'completed' ? ' is-active' : ''}`}
            aria-pressed={statusF === 'completed'}
            onClick={() => setStatusF(statusF === 'completed' ? 'all' : 'completed')}
            title="Filter to Completed requirements"
          >
            <div className="pa-stat-val">{kpis.completedCount}</div>
            <div className="pa-stat-key">Completed</div>
            <div className="pa-stat-sub">across {kpis.totalRows} requirements</div>
          </button>
          <button
            type="button"
            className={`pa-stat${statusF === 'all' ? ' is-active' : ''}`}
            aria-pressed={statusF === 'all'}
            onClick={() => setStatusF('all')}
            title="Show every requirement"
          >
            <div className="pa-stat-val">{kpis.totalDemand}</div>
            <div className="pa-stat-key">Total demand</div>
            <div className="pa-stat-sub">trainer + TA seats</div>
          </button>
        </div>

        {/* ---- Single-row filter band: Client · Domain · Type · Reset ---- */}
        <div className="pa-filters">
          <div className="pa-filter-group">
            <span className="rq-filter-section-label">Client</span>
            <select className="pa-select" value={clientF} onChange={(e) => setClientF(e.target.value)}>
              <option value="">All</option>
              {opts.clients.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="pa-filter-group">
            <span className="rq-filter-section-label">Domain</span>
            <select className="pa-select" value={domainF} onChange={(e) => setDomainF(e.target.value)}>
              <option value="">All</option>
              {opts.domains.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="pa-filter-group">
            <span className="rq-filter-section-label">Type</span>
            <select className="pa-select" value={typeF} onChange={(e) => setTypeF(e.target.value)}>
              <option value="">All</option>
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="pa-filter-spacer" />
          {anyFilter && (
            <button type="button" className="rq-clear-all" onClick={resetAll}>Reset all</button>
          )}
        </div>

        {/* ---- Table ---- */}
        {sorted.length === 0 ? (
          <div className="pa-empty">No requirements match the current filters.</div>
        ) : (
          <div className="rq-table-wrap">
            <table className="rq-table pa-table">
              <colgroup>
                <col style={{ width: '12%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th><SortHeader label="Delivery ID"   sortKey="delivery_id" {...{ sortBy, sortDir, onSort: handleSort }} /></th>
                  <th><SortHeader label="Course / Client" sortKey="course"    {...{ sortBy, sortDir, onSort: handleSort }} /></th>
                  <th><SortHeader label="Window"        sortKey="start"      {...{ sortBy, sortDir, onSort: handleSort }} /></th>
                  <th><SortHeader label="Type"          sortKey="type"       {...{ sortBy, sortDir, onSort: handleSort }} /></th>
                  <th className="rq-th-num"><SortHeader label="Demand" sortKey="demand" {...{ sortBy, sortDir, onSort: handleSort }} align="right" /></th>
                  <th className="rq-th-num"><SortHeader label="INT · FRL" sortKey="filled" {...{ sortBy, sortDir, onSort: handleSort }} align="right" /></th>
                  <th className="rq-th-num"><SortHeader label="Gap" sortKey="gap" {...{ sortBy, sortDir, onSort: handleSort }} align="right" /></th>
                  <th><SortHeader label="Status"        sortKey="status"     {...{ sortBy, sortDir, onSort: handleSort }} /></th>
                  <th><SortHeader label="Onboarding"    sortKey="onboarding" {...{ sortBy, sortDir, onSort: handleSort }} /></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <PendingRow key={`${r.delivery_id}-${startIdx + i}`} r={r} onClick={() => setSelected(r)} />
                ))}
              </tbody>
            </table>

            <div className="rq-pager">
              <div className="rq-pager-info">
                Showing <strong>{rangeStart}</strong>–<strong>{rangeEnd}</strong> of <strong>{sorted.length}</strong>
                {sorted.length !== rows.length && <> filtered from <strong>{rows.length}</strong></>}
              </div>
              <Pager page={safePage} pageCount={pageCount} onPageChange={setPage} />
              <label className="rq-pager-size">
                Rows
                <select value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value, 10))}>
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <RequirementModal
          row={buildRequirementRow(selected.raw)}
          headers={data?.headers || []}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

// ----------------------------------------------------------------------------
function PendingRow({ r, onClick }) {
  const internalPct   = r.required ? (r.internal   / r.required) * 100 : 0;
  const freelancerPct = r.required ? (r.freelancer / r.required) * 100 : 0;
  return (
    <tr className="rq-row cursor-pointer" onClick={onClick}>
      <td className="rq-cell-id"><span className="rq-id">{r.delivery_id || '—'}</span></td>
      <td className="rq-cell-cc">
        <div className="rq-cc-title">{r.course || r.client || '—'}</div>
        {(r.client || r.domain) && (
          <div className="rq-cc-sub">
            {[r.client, r.domain, r.subdomain].filter(Boolean).join(' · ')}
          </div>
        )}
      </td>
      <td><span className="rq-when">{fmtDate(r.start)} → {fmtDate(r.end)}</span></td>
      <td>
        {r.requirementType
          ? <span className={`pa-type-chip pa-type-${(r.requirementType || '').toLowerCase().includes('intern') ? 'int' : 'frl'}`}>{r.requirementType}</span>
          : <span className="rq-num">—</span>}
      </td>
      <td className="rq-cell-num">
        <span className="rq-num">{r.trainerReq}/{r.taReq}</span>
        <div className="pa-row-sub">T · TA</div>
      </td>
      <td className="rq-cell-num">
        <span className="rq-alloc">
          <span className="rq-alloc-int">{r.internal}</span>
          <span className="rq-alloc-sep">·</span>
          <span className="rq-alloc-free">{r.freelancer}</span>
        </span>
        <div className="pa-mini-bar" aria-hidden>
          <span style={{ width: `${internalPct}%`,   background: 'var(--neon-green)' }} />
          <span style={{ width: `${freelancerPct}%`, background: 'var(--neon-yellow)' }} />
        </div>
      </td>
      <td className="rq-cell-num">
        <span className={`rq-num${r.gap > 0 ? ' is-warn' : ''}`}>{r.gap || '—'}</span>
      </td>
      <td>
        <span className={`pa-status-chip pa-status-${r.tone}`}>
          <span className="pa-status-dot" />
          {r.status}
        </span>
      </td>
      <td><span className="rq-when">{fmtDate(r.onboarding)}</span></td>
    </tr>
  );
}

// ----------------------------------------------------------------------------
function SortHeader({ label, sortKey, sortBy, sortDir, onSort, align = 'left' }) {
  const active = sortBy === sortKey;
  return (
    <button
      type="button"
      className={`rq-sort${active ? ' is-active' : ''}${align === 'right' ? ' is-right' : ''}`}
      onClick={() => onSort(sortKey)}
    >
      <span>{label}</span>
      <span className="rq-sort-icon" aria-hidden="true">
        {active
          ? (sortDir === 'asc'
              ? <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 15 12 9 18 15" /></svg>
              : <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>)
          : <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}><polyline points="8 9 12 5 16 9" /><polyline points="8 15 12 19 16 15" /></svg>}
      </span>
    </button>
  );
}

function Pager({ page, pageCount, onPageChange }) {
  if (pageCount <= 1) return null;
  const pages = [];
  const window = 1;
  const first = 1, last = pageCount;
  pages.push(first);
  const start = Math.max(2, page - window);
  const end = Math.min(last - 1, page + window);
  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < last - 1) pages.push('…');
  if (last !== first) pages.push(last);
  return (
    <div className="rq-pager-controls">
      <button type="button" className="rq-pager-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>‹</button>
      {pages.map((p, i) =>
        p === '…'
          ? <span key={`e${i}`} className="rq-pager-ellipsis">…</span>
          : <button
              key={p}
              type="button"
              className={`rq-pager-btn${p === page ? ' is-current' : ''}`}
              onClick={() => onPageChange(p)}
            >{p}</button>
      )}
      <button type="button" className="rq-pager-btn" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>›</button>
    </div>
  );
}
