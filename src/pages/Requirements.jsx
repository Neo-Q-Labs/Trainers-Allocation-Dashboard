import { useMemo, useState, useRef, useEffect } from 'react';
import { useGetRequestTrackQuery } from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';

/* ============================================================
   Requirement — live tabular + Gantt view
   ------------------------------------------------------------
   Source: Request ID Track sheet (useGetRequestTrackQuery).
   Fixed-layout table (columns always aligned + fit the panel),
   searchable Delivery ID / Course / Client dropdown filters,
   status chips, and a real horizontal Gantt timeline.
   ============================================================ */

const parseNum = (v) => {
  if (v == null || v === '') return 0;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const MONTHS_3 = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const MONTHS_CAP = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function parseSheetDate(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return new Date(EXCEL_EPOCH + raw * 86400000);
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return new Date(EXCEL_EPOCH + Number(s) * 86400000);
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

const fmtShort = (d) => (d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—');
const fmtFull  = (d) => (d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function deriveType(row) {
  const internal = parseNum(row['Internal']);
  const fl = parseNum(row['Existing Freelancers']) + parseNum(row['New Freelancers Hired']) + parseNum(row['New Freelancer Required']);
  if (internal > 0 && fl > 0) return 'MIXED';
  if (fl > 0 && internal === 0) return 'FREELANCER';
  return 'INTERNAL';
}

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
  const fl = parseNum(row['Existing Freelancers']) + parseNum(row['New Freelancers Hired']);
  const filled = internal + fl;
  const gap = Math.max(0, required - filled);
  return { trainerReq, taReq, required, filled, gap };
}

function deriveRisk(row, gap) {
  const cell = String(row['Risk'] || '').trim();
  const explicit = parseInt(cell.replace(/[^\d]/g, ''), 10);
  if (Number.isFinite(explicit) && /\d/.test(cell)) return explicit;
  return gap;
}

const riskTone = (risk) => (risk >= 10 ? 'high' : risk >= 4 ? 'med' : risk > 0 ? 'low' : 'none');
const STATUS_TONE = { OPEN: 'open', CLOSED: 'closed', CANCELLED: 'cancelled' };
const TYPE_TONE   = { INTERNAL: 'internal', FREELANCER: 'freelancer', MIXED: 'mixed' };

function windowLabel(start, end) {
  if (start && end) return `${fmtShort(start)} → ${fmtShort(end)}`;
  if (start) return `from ${fmtShort(start)}`;
  if (end)   return `until ${fmtShort(end)}`;
  return '—';
}

const STATUS_FILTERS = ['ALL', 'OPEN', 'CLOSED', 'CANCELLED'];

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

export default function Requirements({ active }) {
  const { data, error, isLoading, refetch } = useGetRequestTrackQuery({ limit: 500 });
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [view, setView]                 = useState('TABLE');
  const [deliveryF, setDeliveryF]       = useState('');
  const [courseF, setCourseF]           = useState('');
  const [clientF, setClientF]           = useState('');
  const [selected, setSelected]         = useState(null);

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
          raw: row, // Save raw record to show detailed information in modal
        };
      })
      .filter((r) => r.delivery_id || r.client || r.course);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (deliveryF && r.delivery_id !== deliveryF) return false;
      if (courseF && r.course !== courseF) return false;
      if (clientF && r.client !== clientF) return false;
      if (!q) return true;
      return (
        r.delivery_id.toLowerCase().includes(q) ||
        r.client.toLowerCase().includes(q) ||
        r.course.toLowerCase().includes(q) ||
        r.domain.toLowerCase().includes(q) ||
        r.subdomain.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter, deliveryF, courseF, clientF]);

  const anyFilter = !!(deliveryF || courseF || clientF || search || statusFilter !== 'ALL');
  const clearAll = () => {
    setDeliveryF(''); setCourseF(''); setClientF(''); setSearch(''); setStatusFilter('ALL');
  };

  if (error) {
    return (
      <ErrorPanel panelId="requirements" active={active}
        error={error?.error || error?.message || 'Failed to load requirements.'}
        onRetry={() => refetch()} />
    );
  }
  if (isLoading && !data) return <LoadingPanel panelId="requirements" active={active} />;

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="requirements">
      <div className="card rq-card">
        <header className="rq-head">
          <div className="rq-head-left">
            <h2 className="rq-title">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" />
              </svg>
              ALL REQUIREMENTS
            </h2>
            <div className="rq-subtitle">
              <strong>{stats.active}</strong> active <span className="rq-dot">·</span> <strong>{stats.archived}</strong> archived
            </div>
          </div>
          <div className="rq-head-right">
            <div className="rq-search-wrap">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="search" className="rq-search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && <button type="button" className="rq-search-clear" onClick={() => setSearch('')} aria-label="Clear">×</button>}
            </div>
            <div className="rq-views" role="tablist">
              <button type="button" role="tab" aria-selected={view === 'TABLE'} className={`rq-view-btn${view === 'TABLE' ? ' is-active' : ''}`} onClick={() => setView('TABLE')}>TABLE</button>
              <button type="button" role="tab" aria-selected={view === 'GANTT'} className={`rq-view-btn${view === 'GANTT' ? ' is-active' : ''}`} onClick={() => setView('GANTT')}>GANTT</button>
            </div>
          </div>
        </header>

        {/* ----- Filter bar: searchable dropdowns + status chips ----- */}
        <div className="rq-filters">
          <SearchSelect label="Delivery ID" value={deliveryF} options={opts.delivery} onChange={setDeliveryF} />
          <SearchSelect label="Course"      value={courseF}   options={opts.course}   onChange={setCourseF} />
          <SearchSelect label="Client"      value={clientF}   options={opts.client}   onChange={setClientF} />
          <div className="rq-status-chips" role="tablist">
            {STATUS_FILTERS.map((opt) => (
              <button key={opt} type="button" role="tab" aria-selected={statusFilter === opt}
                className={`rq-chip${statusFilter === opt ? ' is-active' : ''}`} onClick={() => setStatusFilter(opt)}>
                {opt}
              </button>
            ))}
          </div>
          {anyFilter && (
            <button type="button" className="rq-clear-all" onClick={clearAll}>Clear filters</button>
          )}
        </div>

        {view === 'TABLE'
          ? <RequirementsTable rows={filtered} totalRows={rows.length} onRowClick={handleRowClick} />
          : <GanttChart rows={filtered} onRowClick={handleRowClick} />}
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

/* ----- Requirement detail modal (slide-in panel) ----- */
const META_KEYS     = ["Delivery ID", "Client Name", "Course", "Domain", "Subdomain", "Allocation Status", "Training Status"];
const TIMELINE_KEYS = ["Program Start Date", "Program End Date"];
const REQ_KEYS      = ["Total Trainer Required", "Total TA's Required", "Internal", "Existing Freelancers", "New Freelancers Hired", "New Freelancer Required", "Risk"];
const PLANNED_KEYS  = ["Trainer planned", "TA Planned"];

function RequirementModal({ row, headers, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const raw = row.raw || {};
  const cleanVal = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : '—');
  const valFor = (k) => {
    if (TIMELINE_KEYS.includes(k)) return fmtFull(parseSheetDate(raw[k]));
    // Any other date-named field: format when it parses, else show the raw text.
    if (/date/i.test(k)) {
      const d = parseSheetDate(raw[k]);
      if (d) return fmtFull(d);
    }
    return cleanVal(raw[k]);
  };

  const pick = (keys) => keys.filter((k) => k in raw).map((k) => ({ k, v: valFor(k) }));
  const meta     = pick(META_KEYS);
  const timeline = pick(TIMELINE_KEYS);
  const req      = pick(REQ_KEYS);
  const planned  = pick(PLANNED_KEYS);

  const handled = new Set([...META_KEYS, ...TIMELINE_KEYS, ...REQ_KEYS, ...PLANNED_KEYS]);
  const others = (headers.length ? headers : Object.keys(raw))
    // Drop the per-day allotment columns (pure-numeric Excel-serial headers) — they're
    // the day grid, not meaningful record fields, and only clutter the detail view.
    .filter((h) => h && !h.startsWith('col_') && !/^\d+(\.\d+)?$/.test(h.trim()) && !handled.has(h) && h in raw)
    .map((k) => ({ k, v: valFor(k) }))
    .filter(({ v }) => v !== '—');

  const Section = ({ title, items }) => (
    items.length ? (
      <div className="oa-det-section">
        <div className="oa-det-sec-title">{title}</div>
        <div className="oa-det-grid">
          {items.map(({ k, v }) => (
            <div key={k} className="oa-det-contact-row">
              <span className="oa-det-contact-label">{k}</span>
              <span className="oa-det-contact-value">{v}</span>
            </div>
          ))}
        </div>
      </div>
    ) : null
  );

  return (
    <div className="oa-det-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="oa-det-panel" role="dialog" aria-modal="true" aria-label="Requirement detail">
        <div className="oa-det-head">
          <div className="oa-det-avatar" style={{ background: 'linear-gradient(135deg,#60a5fa,#2563eb)' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: '#fff' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="13" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="oa-det-info">
            <div className="oa-det-name">{row.course || row.client || 'Requirement Details'}</div>
            <div className="oa-det-sub">
              <span className={`oa-tbl-role oa-role-${row.status === 'OPEN' ? 'ta' : row.status === 'CLOSED' ? 'trainer' : 'bench'}`}>{row.status}</span>
              <span className={`oa-tbl-pool ${row.type === 'INTERNAL' ? 'oa-pool-int' : 'oa-pool-frl'}`}>{row.type}</span>
              <span className="oa-tbl-avail oa-avail-partial">{windowLabel(row.start, row.end)}</span>
            </div>
            {row.delivery_id && <div className="oa-det-id">Delivery ID: {row.delivery_id}</div>}
          </div>
          <button type="button" className="oa-det-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="oa-det-body">
          <Section title="General Info" items={meta} />
          <Section title="Timeline" items={timeline} />
          <Section title="Staffing &amp; Risk Requirements" items={req} />
          <Section title="Planned Assignments" items={planned} />
          <Section title="Additional Data Fields" items={others} />
        </div>
      </div>
    </div>
  );
}

/* ----- table ----- */
function RequirementsTable({ rows, totalRows, onRowClick }) {
  if (totalRows === 0) {
    return <div className="rq-empty"><div className="rq-empty-title">No requirements found</div><div className="rq-empty-sub">The Request ID Track sheet returned no rows.</div></div>;
  }
  if (rows.length === 0) {
    return <div className="rq-empty"><div className="rq-empty-title">No matches</div><div className="rq-empty-sub">Nothing matches the current filters.</div></div>;
  }
  return (
    <div className="rq-table-wrap">
      <table className="rq-table">
        <colgroup>
          <col style={{ width: '6px' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '28%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '13%' }} />
        </colgroup>
        <thead>
          <tr>
            <th aria-label="status" />
            <th>Delivery ID</th>
            <th>Course / Client</th>
            <th>Window</th>
            <th>Type</th>
            <th className="rq-th-num">Trainers</th>
            <th className="rq-th-num">TAs</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => <RequirementsRow key={`${r.delivery_id}-${idx}`} row={r} onRowClick={onRowClick} />)}
        </tbody>
      </table>
      <div className="rq-table-foot">
        Showing <strong>{rows.length}</strong> of <strong>{totalRows}</strong> requirement{totalRows === 1 ? '' : 's'}
      </div>
    </div>
  );
}

function RequirementsRow({ row, onRowClick }) {
  const tone = riskTone(row.risk);
  const subBits = [row.client, row.domain, row.subdomain].filter(Boolean);
  const subtitle = subBits.join(' · ');
  return (
    <tr className={`rq-row${row.archived ? ' is-archived' : ''} cursor-pointer`} onClick={() => onRowClick(row)}>
      <td className="rq-cell-bar" aria-hidden="true"><span className={`rq-bar is-${tone}`} /></td>
      <td className="rq-cell-id"><span className="rq-id" title={row.delivery_id || '—'}>{row.delivery_id || '—'}</span></td>
      <td className="rq-cell-cc">
        <div className="rq-cc-title" title={row.course || '—'}>{row.course || row.client || '—'}</div>
        {subtitle && <div className="rq-cc-sub" title={subtitle}>{subtitle}</div>}
      </td>
      <td className="rq-cell-when"><span className="rq-when">{windowLabel(row.start, row.end)}</span></td>
      <td><span className={`rq-chip rq-chip-${TYPE_TONE[row.type] || 'internal'}`}>{row.type}</span></td>
      <td className="rq-cell-num"><span className="rq-num">{row.trainer_required > 0 ? row.trainer_required : '—'}</span></td>
      <td className="rq-cell-num"><span className="rq-num">{row.ta_required > 0 ? row.ta_required : '—'}</span></td>
      <td><span className={`rq-chip rq-chip-status-${STATUS_TONE[row.status]}`}><span className="rq-dot-mark" />{row.status}</span></td>
    </tr>
  );
}

/* ----- Gantt timeline ----- */
function GanttChart({ rows, onRowClick }) {
  const dated = useMemo(() => rows.filter((r) => r.start && r.end && r.end >= r.start), [rows]);

  const domain = useMemo(() => {
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
  }, [dated]);

  // Month gridlines across the domain.
  const monthMarks = useMemo(() => {
    if (!domain) return [];
    const marks = [];
    const d = new Date(domain.min);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1);
    while (d.getTime() <= domain.max) {
      const pct = ((d.getTime() - domain.min) / domain.span) * 100;
      marks.push({ pct, label: `${MONTHS_CAP[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}` });
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
    return marks;
  }, [domain]);

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
              const left = ((r.start.getTime() - domain.min) / domain.span) * 100;
              const width = Math.max(1.2, ((r.end.getTime() - r.start.getTime()) / domain.span) * 100);
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
