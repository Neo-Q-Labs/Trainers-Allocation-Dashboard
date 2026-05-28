import { useMemo, useState, useRef, useEffect } from 'react';
import { useGetRequestTrackQuery } from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';
import ExportButton from '../components/ExportButton.jsx';
import DatePicker from '../components/DatePicker.jsx';
import RequirementModal from '../components/RequirementModal.jsx';
import {
  parseSheetDate, fmtFull,
  STATUS_TONE, TYPE_TONE,
  MONTHS_CAP,
  windowLabel,
  buildRequirementRow,
} from '../lib/req.js';
import { exportToExcel } from '../lib/exportExcel.js';

/* ============================================================
   Requirement — live tabular + Gantt view
   ------------------------------------------------------------
   Source: Request ID Track sheet (useGetRequestTrackQuery).
   Fixed-layout table (columns always aligned + fit the panel),
   searchable Delivery ID / Course / Client dropdown filters,
   status chips, and a real horizontal Gantt timeline.
   ============================================================ */

const STATUS_FILTERS = ['ALL', 'OPEN', 'CLOSED', 'CANCELLED'];
const TYPE_OPTIONS = ['INTERNAL', 'FREELANCER', 'MIXED', 'UNASSIGNED'];

const fmtShort = (d) => (d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—');

/* ----- Date range column (header w/ icon-only Reset+Apply, body w/ two DatePickers) ----- */
function DateRangeColumn({ start, end, onApply }) {
  const [pStart, setPStart] = useState(start);
  const [pEnd, setPEnd]     = useState(end);
  useEffect(() => { setPStart(start); setPEnd(end); }, [start, end]);

  const invalid = !!pStart && !!pEnd && pEnd < pStart;
  const dirty = pStart !== start || pEnd !== end;
  const both  = !!pStart && !!pEnd && !invalid;
  const days  = both ? Math.round((new Date(pEnd) - new Date(pStart)) / 86400000) + 1 : 0;

  const apply = () => { if (!invalid && dirty) onApply(pStart, pEnd); };
  const reset = () => { setPStart(''); setPEnd(''); onApply('', ''); };
  const hasAny = !!(pStart || pEnd || start || end);

  return (
    <section className="rq-filter-col rq-filter-col-date">
      <header className="rq-filter-col-head">
        <span className="rq-filter-section-label">Date Range</span>
        <span className="rq-date-head-tools">
          {both && <span className="drf-badge">{days}d</span>}
          {invalid && <span className="drf-badge is-err">End ≥ Start</span>}
          <button
            type="button"
            className="rq-icon-btn"
            aria-label="Reset date range"
            title="Reset date range"
            disabled={!hasAny}
            onClick={reset}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          <button
            type="button"
            className="rq-icon-btn is-primary"
            aria-label="Apply date range"
            title="Apply date range"
            disabled={invalid || !dirty}
            onClick={apply}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </span>
      </header>
      <div className="rq-filter-col-body rq-filter-col-date-body">
        <div className="rq-date-field">
          <span className="rq-date-flabel">Start</span>
          <DatePicker value={pStart} onChange={setPStart} max={pEnd} ariaLabel="Start date" />
        </div>
        <div className="rq-date-field">
          <span className="rq-date-flabel">End</span>
          <DatePicker value={pEnd} onChange={setPEnd} min={pStart} ariaLabel="End date" />
        </div>
      </div>
    </section>
  );
}

/* ----- Searchable dropdown (app-themed) ----- */
function SearchSelect({ label, value, options, onChange, placeholder = 'All' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const needle = q.trim().toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(needle));
  }, [options, q]);

  return (
    <div ref={ref} className={`rq-select${open ? ' is-open' : ''}${value ? ' is-set' : ''}`}>
      <button type="button" className="rq-select-trigger" onClick={() => setOpen((v) => !v)}>
        <span className="rq-select-label">{label}</span>
        <span className="rq-select-value">{value || placeholder}</span>
        {value ? (
          <span
            className="rq-select-clear"
            role="button"
            aria-label={`Clear ${label}`}
            onClick={(e) => { e.stopPropagation(); onChange(''); setQ(''); }}
          >×</span>
        ) : (
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rq-select-caret">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>
      {open && (
        <div className="rq-select-menu">
          <div className="rq-select-search">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label.toLowerCase()}…`} />
          </div>
          <div className="rq-select-list">
            <button type="button" className={`rq-select-opt${!value ? ' is-active' : ''}`} onClick={() => { onChange(''); setOpen(false); setQ(''); }}>
              {placeholder}
            </button>
            {filtered.length === 0 ? (
              <div className="rq-select-empty">No matches</div>
            ) : (
              filtered.slice(0, 300).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`rq-select-opt${value === opt ? ' is-active' : ''}`}
                  onClick={() => { onChange(opt); setOpen(false); setQ(''); }}
                  title={opt}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
          <div className="rq-select-foot">{filtered.length} option{filtered.length === 1 ? '' : 's'}</div>
        </div>
      )}
    </div>
  );
}

const parseIsoDay = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
};

export default function Requirements({ active, onNewRequirement }) {
  const { data, error, isLoading, refetch } = useGetRequestTrackQuery({ limit: 500 });
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [view, setView]                 = useState('TABLE');
  const [deliveryF, setDeliveryF]       = useState('');
  const [courseF, setCourseF]           = useState('');
  const [clientF, setClientF]           = useState('');
  const [typeF, setTypeF]               = useState('');
  const [fromDate, setFromDate]         = useState('');
  const [toDate, setToDate]             = useState('');
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(25);
  const [sortBy, setSortBy]             = useState(null);   // column key or null
  const [sortDir, setSortDir]           = useState('asc');  // 'asc' | 'desc'
  const [selected, setSelected]         = useState(null);

  const rows = useMemo(() => {
    const raw = data?.rows || [];
    const now = new Date();
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return raw
      .map((row) => buildRequirementRow(row, todayUtc))
      .filter((r) => r && (r.delivery_id || r.client || r.course));
  }, [data]);

  const handleRowClick = (row) => {
    if (!row.raw) return;
    setSelected(row);
  };

  // Distinct option lists for the searchable dropdowns.
  const opts = useMemo(() => {
    const d = new Set(), c = new Set(), cl = new Set();
    for (const r of rows) {
      if (r.delivery_id) d.add(r.delivery_id);
      if (r.course) c.add(r.course);
      if (r.client) cl.add(r.client);
    }
    const sort = (s) => Array.from(s).sort((a, b) => a.localeCompare(b));
    return { delivery: sort(d), course: sort(c), client: sort(cl) };
  }, [rows]);

  const stats = useMemo(() => ({
    active:   rows.filter((r) => !r.archived).length,
    archived: rows.filter((r) =>  r.archived).length,
  }), [rows]);

  const fromTs = useMemo(() => {
    const d = parseIsoDay(fromDate);
    return d ? d.getTime() : null;
  }, [fromDate]);
  const toTs = useMemo(() => {
    const d = parseIsoDay(toDate);
    return d ? d.getTime() + 86400000 - 1 : null;
  }, [toDate]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (deliveryF && r.delivery_id !== deliveryF) return false;
      if (courseF && r.course !== courseF) return false;
      if (clientF && r.client !== clientF) return false;
      if (typeF && r.type !== typeF) return false;
      if (fromTs != null || toTs != null) {
        const s = r.start ? r.start.getTime() : null;
        const e = r.end ? r.end.getTime() : s;
        if (s == null && e == null) return false;
        const rs = s ?? e;
        const re = e ?? s;
        if (fromTs != null && re < fromTs) return false;
        if (toTs   != null && rs > toTs)   return false;
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
  }, [rows, search, statusFilter, deliveryF, courseF, clientF, typeF, fromTs, toTs]);

  const anyFilter = !!(deliveryF || courseF || clientF || typeF || search || fromDate || toDate || statusFilter !== 'ALL');
  const clearAll = () => {
    setDeliveryF(''); setCourseF(''); setClientF(''); setTypeF(''); setSearch(''); setStatusFilter('ALL');
    setFromDate(''); setToDate('');
    setSortBy(null); setSortDir('asc');
  };

  useEffect(() => { setPage(1); }, [search, statusFilter, deliveryF, courseF, clientF, typeF, fromDate, toDate, pageSize, view]);

  const sorted = useMemo(() => {
    if (!sortBy) return filtered;
    const SORT_KEYS = {
      delivery_id:  (r) => r.delivery_id || '',
      course:       (r) => (r.course || r.client || '').toLowerCase(),
      window:       (r) => (r.start ? r.start.getTime() : Number.POSITIVE_INFINITY),
      type:         (r) => r.type || '',
      int_free:     (r) => (r.int_filled || 0) * 1000 + (r.fl_filled || 0),
      trainers:     (r) => r.trainer_required || 0,
      tas:          (r) => r.ta_required || 0,
      status:       (r) => r.status || '',
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
    if (sortBy !== col) {
      setSortBy(col); setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortBy(null); setSortDir('asc');
    }
  };

  const handleExport = () => {
    if (!filtered.length) return;

    // ---- Deduplicate by Delivery ID (keep first occurrence per ID) ----
    const seen = new Set();
    const unique = filtered.filter((r) => {
      const id = r.delivery_id || `__noId_${r.course}_${r.client}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // ---- Sheet 1: Summary (derived / cleaned columns) ----
    const summarySheet = {
      name: 'Summary',
      columns: [
        { header: 'Delivery ID',          key: 'delivery_id'       },
        { header: 'Client',               key: 'client'            },
        { header: 'Course',               key: 'course'            },
        { header: 'Domain',               key: 'domain'            },
        { header: 'Subdomain',            key: 'subdomain'         },
        { header: 'Type',                 key: 'type'              },
        { header: 'Status',               key: 'status'            },
        { header: 'Start Date',           value: (r) => fmtFull(r.start) },
        { header: 'End Date',             value: (r) => fmtFull(r.end)   },
        { header: 'Trainers Required',    key: 'trainer_required'  },
        { header: "TAs Required",         key: 'ta_required'       },
        { header: 'Total Required',       key: 'required'          },
        { header: 'Gap',                  key: 'gap'               },
        { header: 'Risk',                 key: 'risk'              },
        { header: 'Archived',             value: (r) => r.archived ? 'Yes' : 'No' },
      ],
      rows: unique,
    };

    // ---- Sheet 2: Full Detail (every raw field from the source sheet) ----
    // Use the headers returned by the backend; fall back to the union of all keys.
    const rawHeaders = data?.headers?.length
      ? data.headers.filter((h) => h && !/^\d+(\.\d+)?$/.test(h.trim()))
      : Array.from(new Set(unique.flatMap((r) => Object.keys(r.raw || {}))))
          .filter((h) => h && !/^\d+(\.\d+)?$/.test(h.trim()));

    const detailSheet = {
      name: 'Full Detail',
      columns: rawHeaders.map((h) => ({
        header: h,
        value: (r) => {
          const raw = r.raw || {};
          const v = raw[h];
          if (v == null || v === '') return '';
          // Format date-named columns
          if (/date/i.test(h)) {
            const d = parseSheetDate(v);
            if (d) return fmtFull(d);
          }
          return String(v);
        },
      })),
      rows: unique,
    };

    exportToExcel({
      filename: 'requirements',
      sheets: [summarySheet, detailSheet],
    });
  };

  if (error) {
    return (
      <ErrorPanel panelId="requirements" active={active}
        error={error?.error || error?.message || 'Failed to load requirements.'}
        onRetry={() => refetch()} />
    );
  }
  if (isLoading && !data) return <LoadingPanel panelId="requirements" active={active} />;

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount);

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="requirements">
      <div className="card rq-card">
        <header className="rq-head">
          <div className="rq-head-left">
            {view === 'TABLE' && filtered.length > pageSize && (
              <Pager page={safePage} pageCount={pageCount} onPageChange={setPage} />
            )}
            <div className="rq-subtitle">
              <strong>{stats.active}</strong> active <span className="rq-dot">·</span> <strong>{stats.archived}</strong> archived
            </div>
          </div>
          <div className="rq-head-right">
            <div className="rq-search-wrap">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="search" className="rq-search" placeholder="Search requirements, delivery IDs, clients…" value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && <button type="button" className="rq-search-clear" onClick={() => setSearch('')} aria-label="Clear">×</button>}
            </div>
            <div className="rq-views" role="tablist">
              <button type="button" role="tab" aria-selected={view === 'TABLE'} className={`rq-view-btn${view === 'TABLE' ? ' is-active' : ''}`} onClick={() => setView('TABLE')}>TABLE</button>
              <button type="button" role="tab" aria-selected={view === 'GANTT'} className={`rq-view-btn${view === 'GANTT' ? ' is-active' : ''}`} onClick={() => setView('GANTT')}>GANTT</button>
            </div>
            <ExportButton
              onClick={handleExport}
              disabled={!filtered.length}
              label={`Export (${filtered.length})`}
            />
            {onNewRequirement && (
              <button
                type="button"
                className="btn-primary rq-new-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onNewRequirement();
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginRight: '6px', stroke: 'currentColor' }}
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Requirement
              </button>
            )}
          </div>
        </header>

        {/* ----- Filter bar: Filter-By 2x2 (left) · Date Range (mid) · Status (right) ----- */}
        <div className="rq-filters">
          <section className="rq-filter-col rq-filter-col-filter">
            <header className="rq-filter-col-head">
              <span className="rq-filter-section-label">Filter By</span>
              {anyFilter && (
                <button type="button" className="rq-clear-all" onClick={clearAll}>Reset all</button>
              )}
            </header>
            <div className="rq-filter-col-body is-2x2">
              <SearchSelect label="Delivery ID" value={deliveryF} options={opts.delivery} onChange={setDeliveryF} />
              <SearchSelect label="Course"      value={courseF}   options={opts.course}   onChange={setCourseF} />
              <SearchSelect label="Client"      value={clientF}   options={opts.client}   onChange={setClientF} />
              <SearchSelect label="Type"        value={typeF}     options={TYPE_OPTIONS}  onChange={setTypeF} />
            </div>
          </section>
          <DateRangeColumn
            start={fromDate}
            end={toDate}
            onApply={(s, e) => { setFromDate(s || ''); setToDate(e || ''); }}
          />
          <section className="rq-filter-col rq-filter-col-status">
            <header className="rq-filter-col-head">
              <span className="rq-filter-section-label">Status</span>
            </header>
            <div className="rq-filter-col-body rq-status-chips" role="tablist">
              {STATUS_FILTERS.map((opt) => (
                <button key={opt} type="button" role="tab" aria-selected={statusFilter === opt}
                  className={`rq-chip${statusFilter === opt ? ' is-active' : ''}`} onClick={() => setStatusFilter(opt)}>
                  {opt}
                </button>
              ))}
            </div>
          </section>
        </div>

        {view === 'TABLE'
          ? <RequirementsTable
              rows={sorted}
              totalRows={rows.length}
              onRowClick={handleRowClick}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
            />
          : <GanttChart rows={sorted} onRowClick={handleRowClick} filterFromTs={fromTs} filterToTs={toTs} />}
      </div>

      {selected && (
        <RequirementModal
          row={selected}
          headers={data?.headers || []}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

/* RequirementModal + trainer helpers are now imported from components/RequirementModal.jsx
   so the same drawer renders identically when opened from Calendar/Clients/Matrix. */


/* ----- pagination ----- */
function Pager({ page, pageCount, onPageChange }) {
  if (pageCount <= 1) return null;
  const pages = [];
  const push = (p) => pages.push(p);
  const window = 1;
  const first = 1;
  const last = pageCount;
  push(first);
  const start = Math.max(2, page - window);
  const end = Math.min(last - 1, page + window);
  if (start > 2) push('…');
  for (let i = start; i <= end; i += 1) push(i);
  if (end < last - 1) push('…');
  if (last !== first) push(last);

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

/* ----- table ----- */
function RequirementsTable({ rows, totalRows, onRowClick, page, pageSize, onPageChange, onPageSizeChange, sortBy, sortDir, onSort }) {
  if (totalRows === 0) {
    return <div className="rq-empty"><div className="rq-empty-title">No requirements found</div><div className="rq-empty-sub">The Request ID Track sheet returned no rows.</div></div>;
  }
  if (rows.length === 0) {
    return <div className="rq-empty"><div className="rq-empty-title">No matches</div><div className="rq-empty-sub">Nothing matches the current filters.</div></div>;
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const startIdx = (safePage - 1) * pageSize;
  const visible = rows.slice(startIdx, startIdx + pageSize);
  const rangeStart = startIdx + 1;
  const rangeEnd = startIdx + visible.length;

  return (
    <div className="rq-table-wrap">
      <table className="rq-table">
        <colgroup>
          <col style={{ width: '13%' }} />
          <col style={{ width: '26%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '12%' }} />
        </colgroup>
        <thead>
          <tr>
            <th><SortHeader label="Delivery ID"   sortKey="delivery_id" sortBy={sortBy} sortDir={sortDir} onSort={onSort} /></th>
            <th><SortHeader label="Course / Client" sortKey="course"    sortBy={sortBy} sortDir={sortDir} onSort={onSort} /></th>
            <th><SortHeader label="Window"        sortKey="window"      sortBy={sortBy} sortDir={sortDir} onSort={onSort} /></th>
            <th><SortHeader label="Type"          sortKey="type"        sortBy={sortBy} sortDir={sortDir} onSort={onSort} /></th>
            <th className="rq-th-num"><SortHeader label="INT · FREE" sortKey="int_free" sortBy={sortBy} sortDir={sortDir} onSort={onSort} align="right" /></th>
            <th className="rq-th-num"><SortHeader label="Trainers"   sortKey="trainers" sortBy={sortBy} sortDir={sortDir} onSort={onSort} align="right" /></th>
            <th className="rq-th-num"><SortHeader label="TAs"        sortKey="tas"      sortBy={sortBy} sortDir={sortDir} onSort={onSort} align="right" /></th>
            <th><SortHeader label="Status"        sortKey="status"     sortBy={sortBy} sortDir={sortDir} onSort={onSort} /></th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r, idx) => <RequirementsRow key={`${r.delivery_id}-${startIdx + idx}`} row={r} onRowClick={onRowClick} />)}
        </tbody>
      </table>
      <div className="rq-pager">
        <div className="rq-pager-info">
          Showing <strong>{rangeStart}</strong>–<strong>{rangeEnd}</strong> of <strong>{rows.length}</strong>
          {rows.length !== totalRows && <> filtered from <strong>{totalRows}</strong></>}
        </div>
        <Pager page={safePage} pageCount={pageCount} onPageChange={onPageChange} />
        <label className="rq-pager-size">
          Rows
          <select value={pageSize} onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function RequirementsRow({ row, onRowClick }) {
  const subBits = [row.client, row.domain, row.subdomain].filter(Boolean);
  const subtitle = subBits.join(' · ');
  return (
    <tr className={`rq-row${row.archived ? ' is-archived' : ''} cursor-pointer`} onClick={() => onRowClick(row)}>
      <td className="rq-cell-id"><span className="rq-id" title={row.delivery_id || '—'}>{row.delivery_id || '—'}</span></td>
      <td className="rq-cell-cc">
        <div className="rq-cc-title" title={row.course || '—'}>{row.course || row.client || '—'}</div>
        {subtitle && <div className="rq-cc-sub" title={subtitle}>{subtitle}</div>}
      </td>
      <td className="rq-cell-when"><span className="rq-when">{windowLabel(row.start, row.end)}</span></td>
      <td><span className={`rq-chip rq-chip-${TYPE_TONE[row.type] || 'unassigned'}`}>{row.type}</span></td>
      <td className="rq-cell-num">
        {(row.int_filled > 0 || row.fl_filled > 0) ? (
          <span className="rq-alloc">
            <span className="rq-alloc-int">{row.int_filled}</span>
            <span className="rq-alloc-sep">:</span>
            <span className="rq-alloc-free">{row.fl_filled}</span>
          </span>
        ) : (
          <span className="rq-num">—</span>
        )}
      </td>
      <td className="rq-cell-num"><span className="rq-num">{row.trainer_required > 0 ? row.trainer_required : '—'}</span></td>
      <td className="rq-cell-num"><span className="rq-num">{row.ta_required > 0 ? row.ta_required : '—'}</span></td>
      <td><span className={`rq-chip rq-chip-status-${STATUS_TONE[row.status]}`}><span className="rq-dot-mark" />{row.status}</span></td>
    </tr>
  );
}

/* ----- Gantt timeline ----- */
function GanttChart({ rows, onRowClick, filterFromTs, filterToTs }) {
  const dated = useMemo(() => rows.filter((r) =>
    r.start && r.end && r.end >= r.start &&
    // Drop rows with no human label — they render as blank bars that overflow
    // the viewport without any way to tell what they are.
    (r.delivery_id || r.course || r.client)
  ), [rows]);

  // When the user has set a Date Range filter, that range drives the Gantt
  // domain (so the adaptive granularity reflects what they asked for, not
  // the full envelope of every matching programme). Otherwise we fall back
  // to the min/max of the visible rows with a small day of padding.
  const domain = useMemo(() => {
    if (filterFromTs != null || filterToTs != null) {
      let min = filterFromTs;
      let max = filterToTs;
      if (min == null && dated.length) min = Math.min(...dated.map((r) => r.start.getTime()));
      if (max == null && dated.length) max = Math.max(...dated.map((r) => r.end.getTime()));
      if (min == null || max == null) return null;
      if (max < min) [min, max] = [max, min];
      return { min, max, span: Math.max(1, max - min) };
    }
    if (!dated.length) return null;
    let min = dated[0].start.getTime();
    let max = dated[0].end.getTime();
    for (const r of dated) {
      min = Math.min(min, r.start.getTime());
      max = Math.max(max, r.end.getTime());
    }
    // pad a few days each side for breathing room
    min -= 2 * 86400000;
    max += 2 * 86400000;
    return { min, max, span: Math.max(1, max - min) };
  }, [dated, filterFromTs, filterToTs]);

  // Adaptive timeline — picks a granularity (day/week/month/quarter) so the
  // axis always reads as ~10 evenly spaced columns regardless of date-range
  // length. ≤10 days → day, ≤10 weeks → week, ≤10 months → month, beyond → quarter.
  const { axisMarks, axisGran } = useMemo(() => {
    if (!domain) return { axisMarks: [], axisGran: 'month' };
    const DAY = 86400000;
    const totalDays   = domain.span / DAY;
    const totalWeeks  = totalDays / 7;
    const totalMonths = totalDays / 30.4375;

    let gran;
    if (totalDays   <= 10) gran = 'day';
    else if (totalWeeks  <= 10) gran = 'week';
    else if (totalMonths <= 10) gran = 'month';
    else                        gran = 'quarter';

    const marks = [];
    const cursor = new Date(domain.min);
    // Snap cursor to the start of the granularity unit so labels read cleanly.
    if (gran === 'day') {
      cursor.setUTCHours(0, 0, 0, 0);
    } else if (gran === 'week') {
      cursor.setUTCHours(0, 0, 0, 0);
      cursor.setUTCDate(cursor.getUTCDate() - cursor.getUTCDay());
    } else if (gran === 'month') {
      cursor.setUTCDate(1);
      cursor.setUTCHours(0, 0, 0, 0);
    } else {
      const m = cursor.getUTCMonth();
      cursor.setUTCDate(1);
      cursor.setUTCMonth(Math.floor(m / 3) * 3);
      cursor.setUTCHours(0, 0, 0, 0);
    }

    const step = () => {
      if (gran === 'day')   cursor.setUTCDate(cursor.getUTCDate() + 1);
      if (gran === 'week')  cursor.setUTCDate(cursor.getUTCDate() + 7);
      if (gran === 'month') cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      if (gran === 'quarter') cursor.setUTCMonth(cursor.getUTCMonth() + 3);
    };

    const fmtLabel = (d) => {
      const day = d.getUTCDate();
      const mon = MONTHS_CAP[d.getUTCMonth()];
      const yy  = String(d.getUTCFullYear()).slice(2);
      if (gran === 'day')   return `${day} ${mon}`;
      if (gran === 'week')  return `${day} ${mon}`;
      if (gran === 'month') return `${mon} ${yy}`;
      const q = Math.floor(d.getUTCMonth() / 3) + 1;
      return `Q${q} ${yy}`;
    };

    while (cursor.getTime() <= domain.max && marks.length < 24) {
      const t = cursor.getTime();
      if (t >= domain.min) {
        const pct = ((t - domain.min) / domain.span) * 100;
        marks.push({ pct, label: fmtLabel(cursor) });
      }
      step();
    }
    return { axisMarks: marks, axisGran: gran };
  }, [domain]);
  // Kept as alias so the JSX below stays minimal.
  const monthMarks = axisMarks;

  const todayPct = useMemo(() => {
    if (!domain) return null;
    const t = Date.now();
    if (t < domain.min || t > domain.max) return null;
    return ((t - domain.min) / domain.span) * 100;
  }, [domain]);

  if (!dated.length) {
    return (
      <div className="rq-empty">
        <div className="rq-empty-title">No dated requirements to chart</div>
        <div className="rq-empty-sub">Rows need both a Program Start &amp; End date to appear on the Gantt.</div>
      </div>
    );
  }

  const sorted = [...dated].sort((a, b) => a.start - b.start);

  return (
    <div className="rq-gantt">
      <div className="rq-gantt-scroll">
        <div className="rq-gantt-inner">
          {/* timeline header */}
          <div className="rq-gantt-axis">
            <div className="rq-gantt-axis-label">Delivery</div>
            <div className="rq-gantt-axis-track">
              {monthMarks.map((m, i) => (
                <div key={i} className="rq-gantt-month" style={{ left: `${m.pct}%` }}>
                  <span className="rq-gantt-month-label">{m.label}</span>
                </div>
              ))}
              {todayPct != null && (
                <div className="rq-gantt-today" style={{ left: `${todayPct}%` }}><span>TODAY</span></div>
              )}
            </div>
          </div>

          {/* rows */}
          <div className="rq-gantt-rows">
            {sorted.map((r, idx) => {
              // Clamp to [0,100]% so bars whose window extends past the
              // visible range don't overflow the track.
              const rawLeft  = ((r.start.getTime() - domain.min) / domain.span) * 100;
              const rawRight = ((r.end.getTime()   - domain.min) / domain.span) * 100;
              const left  = Math.max(0,   Math.min(100, rawLeft));
              const right = Math.max(0,   Math.min(100, rawRight));
              const width = Math.max(1.2, right - left);
              const tone = STATUS_TONE[r.status] || 'open';
              return (
                <div key={`${r.delivery_id}-${idx}`} className="rq-gantt-row">
                  <div className="rq-gantt-row-label" title={`${r.delivery_id} · ${r.course}`}>
                    <span className="rq-gantt-row-id">{r.delivery_id || '—'}</span>
                    <span className="rq-gantt-row-course">{r.course || r.client || '—'}</span>
                  </div>
                  <div className="rq-gantt-row-track">
                    {monthMarks.map((m, i) => (
                      <div key={i} className="rq-gantt-gridline" style={{ left: `${m.pct}%` }} />
                    ))}
                    {todayPct != null && <div className="rq-gantt-today-line" style={{ left: `${todayPct}%` }} />}
                    <div
                      className={`rq-gantt-bar rq-gantt-bar-${tone} cursor-pointer`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${r.delivery_id} · ${r.course}\n${fmtShort(r.start)} → ${fmtShort(r.end)}\n${r.trainer_required} trainers · ${r.ta_required} TAs · ${r.status}`}
                      onClick={() => onRowClick(r)}
                    >
                      <span className="rq-gantt-bar-label">{r.course || r.delivery_id}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="rq-gantt-legend">
        <span className="rq-gantt-leg"><span className="rq-gantt-swatch is-open" /> Open</span>
        <span className="rq-gantt-leg"><span className="rq-gantt-swatch is-closed" /> Closed</span>
        <span className="rq-gantt-leg"><span className="rq-gantt-swatch is-cancelled" /> Cancelled</span>
        <span className="rq-gantt-foot-note">{sorted.length} dated requirement{sorted.length === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
}
