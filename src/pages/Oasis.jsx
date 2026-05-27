import { useMemo, useState, useEffect, useRef } from 'react';
import {
  useGetOasisOptionsQuery,
  useAssessOpportunityMutation,
} from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';

/* ============================================================
   OASIS · Opportunity Assessment & Staffing Index
   ------------------------------------------------------------
   Simulator form with Delivery ID auto-fill, TA field, table
   results, and a slide-in candidate detail panel. Every datum
   comes from the live Trainer Data Live + Request ID Track
   sheets — no mock fallbacks.
   ============================================================ */

const toIso = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const defaultRange = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end   = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { from: toIso(start), to: toIso(end) };
};

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#22d3ee,#3b82f6)',
  'linear-gradient(135deg,#a78bfa,#6366f1)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#34d399,#10b981)',
  'linear-gradient(135deg,#f472b6,#a855f7)',
  'linear-gradient(135deg,#fbbf24,#f59e0b)',
  'linear-gradient(135deg,#60a5fa,#2563eb)',
  'linear-gradient(135deg,#fb7185,#e11d48)',
];
const pickAvatar = (name) => {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
};
const initials = (name) =>
  (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

const formatPool = (c) => {
  if (!c.is_internal) {
    const bench = (c.vendor || '').toLowerCase().includes('bench') || c.type_raw?.toLowerCase().includes('bench');
    return bench ? 'Freelancer · Bench' : (c.vendor ? `Freelancer · ${c.vendor}` : 'Freelancer');
  }
  if (c.type === 'SME')  return 'Internal SME';
  if (c.type === 'WILP') return 'Internal WILP';
  return 'Internal Fulltime';
};

const scoreTone = (s) => s >= 75 ? 'high' : s >= 50 ? 'mid' : 'low';

const STATUS_TONE = {
  fully_achievable: 'ok',
  partial:          'warn',
  needs_swap:       'warn',
  needs_hire:       'bad',
  info:             'info',
};

// ---- Score breakdown helper (mirrors backend formula) ----
const scoreBreakdown = (c) => {
  const skill = Math.round(50 * Math.min(1, Math.max(0, c.skill_overlap || 0)));
  const avail = Math.round(30 * Math.min(1, Math.max(0, c.avail_ratio || 0)));
  const pool  = c.is_internal ? 10 : 7;
  const depth = Math.min(10, Math.round(Math.pow(c.engagement || 0, 0.5) * 2.2));
  return [
    { label: 'Skill Match', pts: skill, max: 50 },
    { label: 'Availability', pts: avail, max: 30 },
    { label: 'Pool (Internal/Freelancer)', pts: pool, max: 10 },
    { label: 'Engagement Depth', pts: depth, max: 10 },
  ];
};

export default function Oasis({ active }) {
  const def = useMemo(defaultRange, []);

  // ----- Form state ---------------------------------------------------------
  const [deliveryId, setDeliveryId] = useState('');
  const [client,     setClient]     = useState('');
  const [track,      setTrack]      = useState('');
  const [from,       setFrom]       = useState(def.from);
  const [to,         setTo]         = useState(def.to);
  const [trainers,   setTrainers]   = useState(5);
  const [ta,         setTa]         = useState(0);

  // ----- Detail modal -------------------------------------------------------
  const [selected, setSelected] = useState(null);

  // ----- Backend integration ------------------------------------------------
  const {
    data: opts,
    error: optsError,
    isLoading: optsLoading,
    refetch: refetchOpts,
  } = useGetOasisOptionsQuery();

  const [
    assess,
    { data: result, error: assessError, isLoading: assessing, reset: resetAssess },
  ] = useAssessOpportunityMutation();

  // Auto-pick first values when options arrive so the form is never blank.
  useEffect(() => {
    if (opts?.clients?.length && !client) setClient(opts.clients[0]);
  }, [opts, client]);
  useEffect(() => {
    if (opts?.primary_tracks?.length && !track) setTrack(opts.primary_tracks[0]);
  }, [opts, track]);

  // Memoised delivery options list
  const deliveryIds = useMemo(() => opts?.deliveries || [], [opts]);

  // Auto-fill form fields when a Delivery ID is selected
  const handleDeliverySelect = (did) => {
    setDeliveryId(did);
    const rec = deliveryIds.find((d) => d.delivery_id === did);
    if (!rec) return;
    if (rec.client)        setClient(rec.client);
    if (rec.primary_track) setTrack(rec.primary_track);
    if (rec.start_date)    setFrom(rec.start_date);
    if (rec.end_date)      setTo(rec.end_date);
    if (rec.trainers != null) setTrainers(rec.trainers);
    if (rec.ta != null)       setTa(rec.ta);
  };

  const dateInvalid = !!from && !!to && from > to;
  const formValid   = !!from && !!to && !dateInvalid && Number(trainers) >= 0;

  const handleSimulate = async () => {
    if (!formValid || assessing) return;
    await assess({
      delivery_id:   deliveryId,
      delivery_name: deliveryId,
      client,
      primary_track: track,
      start_date:    from,
      end_date:      to,
      demand:        Number(trainers) || 0,
      ta_demand:     Number(ta) || 0,
    }).unwrap().catch(() => {});
  };

  const handleReset = () => {
    setDeliveryId('');
    setClient(opts?.clients?.[0] || '');
    setTrack(opts?.primary_tracks?.[0] || '');
    const pr = defaultRange();
    setFrom(pr.from);
    setTo(pr.to);
    setTrainers(5);
    setTa(0);
    setSelected(null);
    resetAssess();
  };

  const candidateRef = useRef(null);
  const scrollToCandidates = () =>
    candidateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleExport = () => {
    if (!result?.candidates?.length) return;
    const rows = [
      ['Rank', 'Name', 'Employee ID', 'Pool', 'Fit Score', 'Availability', 'Role', 'Skills'],
      ...result.candidates.map((c, i) => [
        i + 1,
        c.name,
        c.employee_id,
        formatPool(c),
        c.fit_score,
        c.avail_label || '',
        c.suggested_role || '',
        (c.skills || []).join(' / '),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `oasis-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ----- Render -------------------------------------------------------------
  if (optsError) {
    return (
      <ErrorPanel
        panelId="oasis"
        active={active}
        error={optsError?.error || optsError?.message || 'Failed to load OASIS options.'}
        onRetry={() => refetchOpts()}
      />
    );
  }
  if (optsLoading && !opts) return <LoadingPanel panelId="oasis" active={active} />;

  const clients = opts?.clients || [];
  const tracks  = opts?.primary_tracks || [];

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="oasis">
      {/* OASIS-local sub-toolbar */}
      <div className="oa-toolbar">
        <div className="oa-toolbar-spacer" />
        <button
          type="button"
          className="oa-tool-btn"
          onClick={handleExport}
          disabled={!result?.candidates?.length}
          title={result ? 'Export candidates as CSV' : 'Run a simulation first'}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          EXPORT
        </button>
      </div>

      {/* ===== Capacity Simulator card ====================================== */}
      <div className="card oa-card">
        <header className="oa-head">
          <div className="oa-head-left">
            <div className="oa-head-title">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9" />
                <polyline points="21 4 21 12 13 12" />
              </svg>
              CAPACITY SIMULATOR · OASIS
            </div>
            <div className="oa-head-sub">
              Opportunity Assessment &amp; Staffing Index — select a Delivery ID to auto-fill or enter details manually
            </div>
          </div>
          <span className="oa-pill oa-pill-warn">
            <span className="oa-dot" />
            SIMULATION ONLY — NOT SAVED
          </span>
        </header>

        <div className="oa-form">
          {/* Delivery ID — searchable dropdown that auto-fills the rest */}
          <Field label="DELIVERY ID" className="oa-f-delivery">
            <ListSelect
              value={deliveryId}
              options={deliveryIds.map((d) => d.delivery_id)}
              onChange={handleDeliverySelect}
              placeholder="Select or search ID…"
              ariaLabel="Delivery ID"
              searchable
            />
          </Field>

          <Field label="CLIENT" className="oa-f-client">
            <ListSelect
              value={client}
              options={clients}
              onChange={setClient}
              placeholder="Select client…"
              ariaLabel="Client"
              searchable
            />
          </Field>

          <Field label="PRIMARY TRACK" className="oa-f-track">
            <ListSelect
              value={track}
              options={tracks}
              onChange={setTrack}
              placeholder="Select primary track…"
              ariaLabel="Primary track"
              searchable
            />
          </Field>

          <Field label="FROM" className="oa-f-from">
            <input
              type="date"
              className="oa-input oa-input-date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>

          <Field label="TO" className="oa-f-to" error={dateInvalid ? 'End ≥ Start' : ''}>
            <input
              type="date"
              className={`oa-input oa-input-date${dateInvalid ? ' is-error' : ''}`}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              min={from || undefined}
            />
          </Field>

          <Field label="TRAINERS" className="oa-f-trainers">
            <input
              type="number"
              min="0"
              className="oa-input oa-input-num"
              value={trainers}
              onChange={(e) =>
                setTrainers(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))
              }
            />
          </Field>

          <Field label="TA" className="oa-f-ta">
            <input
              type="number"
              min="0"
              className="oa-input oa-input-num"
              value={ta}
              onChange={(e) =>
                setTa(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))
              }
            />
          </Field>

          <div className="oa-f-actions">
            <button type="button" className="oa-btn-reset" onClick={handleReset} disabled={assessing} title="Clear simulation">
              Reset
            </button>
            <button
              type="button"
              className={`oa-btn-simulate${assessing ? ' is-loading' : ''}`}
              onClick={handleSimulate}
              disabled={!formValid || assessing}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {assessing ? 'Simulating…' : 'SIMULATE'}
            </button>
          </div>
        </div>

        {assessError && (
          <div className="oa-error">
            {assessError?.data?.detail || assessError?.error || 'Assessment failed.'}
          </div>
        )}

        {result && !result.error && (
          <>
            {/* Result banner */}
            <div className={`oa-banner oa-banner-${STATUS_TONE[result.status] || 'info'}`}>
              <div className="oa-banner-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="oa-banner-text">
                <div className="oa-banner-title">{result.headline}</div>
                <div className="oa-banner-sub">
                  <strong>{result.summary.trainers_requested}</strong> trainers
                  {result.summary.tas_requested > 0 && (
                    <><span className="oa-banner-sep">+</span><strong>{result.summary.tas_requested}</strong> TAs</>
                  )}
                  <span className="oa-banner-sep">·</span>
                  <strong>{result.summary.fully_available}</strong> fully available
                  <span className="oa-banner-sep">·</span>
                  <strong>{result.summary.partial_available}</strong> partial
                  <span className="oa-banner-sep">·</span>
                  <strong>{result.summary.hard_conflicts}</strong> hard conflicts
                </div>
              </div>
              <button type="button" className="oa-view-detail" onClick={scrollToCandidates}>
                VIEW DETAIL
              </button>
            </div>

            {/* Metric tiles */}
            <div className="oa-metrics">
              <Metric tone="ok"      label="FULL AVAILABILITY"   value={result.summary.full_availability}   note={result.summary.full_availability_label} />
              <Metric tone="warn"    label="STAGGERED FITS"      value={result.summary.staggered_fits}      note={result.summary.staggered_fits_label} />
              <Metric tone="neutral" label="REPLACEMENT OPENS"   value={result.summary.replacement_opens}   note={result.summary.replacement_opens_label} />
              <Metric tone="neutral" label="HIRE RECOMMENDATION" value={result.summary.hire_recommendation} note={result.summary.hire_recommendation_label} />
            </div>

            {/* Ranked candidates table */}
            <div className="oa-cands" ref={candidateRef}>
              <div className="oa-cands-head">
                <div className="oa-cands-title">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  TRAINER CANDIDATES · RANKED
                  <span className="oa-tbl-count">({result.candidates.length})</span>
                </div>
                <div className="oa-cands-legend">
                  <span className="oa-leg oa-leg-int"><span className="oa-leg-dot" /> INTERNAL FIRST</span>
                  <span className="oa-leg oa-leg-frl"><span className="oa-leg-dot" /> FREELANCER BENCH</span>
                </div>
              </div>

              {result.candidates.length === 0 ? (
                <div className="oa-empty">No matching trainers for the requested track and date range.</div>
              ) : (
                <CandidatesTable
                  candidates={result.candidates}
                  onSelect={setSelected}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Candidate detail slide-in panel */}
      {selected && (
        <CandidateModal
          candidate={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

/* ============================================================
   Sub-components
   ============================================================ */

function Field({ label, className = '', error, children }) {
  return (
    <div className={`oa-field ${className}`}>
      <label className="oa-label">{label}</label>
      {children}
      {error && <div className="oa-field-err">{error}</div>}
    </div>
  );
}

function ListSelect({ value, options, onChange, placeholder, ariaLabel, searchable = false }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey  = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search, searchable]);

  return (
    <div ref={ref} className={`oa-select${open ? ' is-open' : ''}`}>
      <button type="button" className="oa-select-trigger" onClick={() => setOpen((v) => !v)} aria-label={ariaLabel}>
        <span className={`oa-select-value${value ? '' : ' is-placeholder'}`}>{value || placeholder || 'Select…'}</span>
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="oa-select-caret">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="oa-select-menu">
          {searchable && (
            <div className="oa-select-search">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" />
            </div>
          )}
          <div className="oa-select-list">
            {filtered.length === 0 ? (
              <div className="oa-select-empty">No matches</div>
            ) : (
              filtered.slice(0, 200).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`oa-select-opt${value === opt ? ' is-active' : ''}`}
                  onClick={() => { onChange(opt); setOpen(false); setSearch(''); }}
                  title={opt}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, note, tone = 'neutral' }) {
  return (
    <div className={`oa-metric oa-metric-${tone}`}>
      <div className="oa-metric-label">{label}</div>
      <div className="oa-metric-value">{value}</div>
      <div className="oa-metric-note">{note}</div>
    </div>
  );
}

/* ----- Candidates table ----- */
function CandidatesTable({ candidates, onSelect }) {
  return (
    <div className="oa-tbl-wrap">
      <table className="oa-tbl">
        <thead className="oa-tbl-head">
          <tr>
            <th className="oa-tbl-th">#</th>
            <th className="oa-tbl-th">TRAINER</th>
            <th className="oa-tbl-th">POOL</th>
            <th className="oa-tbl-th">SCORE</th>
            <th className="oa-tbl-th">AVAILABILITY</th>
            <th className="oa-tbl-th">SKILLS</th>
            <th className="oa-tbl-th">ROLE</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c, i) => (
            <CandidateRow key={`${c.employee_id || ''}-${c.name}-${i}`} c={c} rank={i + 1} onSelect={onSelect} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CandidateRow({ c, rank, onSelect }) {
  const tone    = scoreTone(c.fit_score);
  const avCls   = c.bucket === 'full' ? 'full' : c.bucket === 'staggered' ? 'partial' : 'replace';
  const roleCls = (c.suggested_role || '').toLowerCase();

  return (
    <tr className="oa-tbl-tr" onClick={() => onSelect(c)} title="Click for details">
      <td className="oa-tbl-td">
        <span className="oa-tbl-rank">{rank}</span>
      </td>
      <td className="oa-tbl-td">
        <div className="oa-tbl-trainer">
          <div className="oa-tbl-avatar" style={{ background: pickAvatar(c.name) }}>
            {initials(c.name)}
          </div>
          <div>
            <div className="oa-tbl-name" title={c.name}>{c.name || '—'}</div>
            {c.employee_id && <div className="oa-tbl-id">{c.employee_id}</div>}
          </div>
        </div>
      </td>
      <td className="oa-tbl-td">
        <span className={`oa-tbl-pool ${c.is_internal ? 'oa-pool-int' : 'oa-pool-frl'}`}>
          {c.is_internal ? 'Internal' : 'Freelancer'}
        </span>
      </td>
      <td className="oa-tbl-td">
        <span className={`oa-tbl-score oa-score-${tone}`}>{c.fit_score}</span>
      </td>
      <td className="oa-tbl-td">
        <span className={`oa-tbl-avail oa-avail-${avCls}`}>{c.avail_label}</span>
      </td>
      <td className="oa-tbl-td">
        <div className="oa-tbl-skills">
          {(c.skills || []).slice(0, 3).map((s, i2) => (
            <span key={`${s}-${i2}`} className="oa-skill">{s}</span>
          ))}
        </div>
      </td>
      <td className="oa-tbl-td">
        {c.suggested_role && (
          <span className={`oa-tbl-role oa-role-${roleCls}`}>{c.suggested_role}</span>
        )}
      </td>
    </tr>
  );
}

/* ----- Candidate detail slide-in panel ----- */
function CandidateModal({ candidate: c, onClose }) {
  const tone    = scoreTone(c.fit_score);
  const avCls   = c.bucket === 'full' ? 'full' : c.bucket === 'staggered' ? 'partial' : 'replace';
  const roleCls = (c.suggested_role || '').toLowerCase();
  const bars    = scoreBreakdown(c);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="oa-det-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="oa-det-panel" role="dialog" aria-modal="true" aria-label={`${c.name} detail`}>
        {/* Header */}
        <div className="oa-det-head">
          <div className="oa-det-avatar" style={{ background: pickAvatar(c.name) }}>
            {initials(c.name)}
          </div>
          <div className="oa-det-info">
            <div className="oa-det-name">{c.name || '—'}</div>
            <div className="oa-det-sub">
              <span className={`oa-tbl-pool ${c.is_internal ? 'oa-pool-int' : 'oa-pool-frl'}`}>
                {formatPool(c)}
              </span>
              {c.suggested_role && (
                <span className={`oa-tbl-role oa-role-${roleCls}`}>{c.suggested_role}</span>
              )}
              <span className={`oa-tbl-avail oa-avail-${avCls}`}>{c.avail_label}</span>
            </div>
            {c.employee_id && <div className="oa-det-id">{c.employee_id}</div>}
          </div>
          <button type="button" className="oa-det-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="oa-det-body">
          {/* Contact info */}
          <div className="oa-det-section">
            <div className="oa-det-sec-title">Contact &amp; Profile</div>
            <div className="oa-det-grid">
              <ContactRow label="Email">
                {c.email
                  ? <a href={`mailto:${c.email}`}>{c.email}</a>
                  : <span style={{ color: 'var(--text-muted)' }}>—</span>
                }
              </ContactRow>
              <ContactRow label="Phone">
                {c.phone || <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </ContactRow>
              <ContactRow label="Designation">
                {c.designation || <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </ContactRow>
              <ContactRow label="Campus">
                {c.campus || <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </ContactRow>
              <ContactRow label="Type">
                {c.type_raw || c.type || '—'}
              </ContactRow>
              <ContactRow label="Joining Date">
                {c.joining_date || <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </ContactRow>
            </div>
          </div>

          {/* Availability schedule */}
          {c.schedule_in_range?.length > 0 && (
            <div className="oa-det-section">
              <div className="oa-det-sec-title">Availability · {c.schedule_in_range.length}-Day Schedule</div>
              <div className="oa-det-sched-legend">
                <span className="oa-sleg oa-sleg-free">FREE</span>
                <span className="oa-sleg oa-sleg-busy">BUSY</span>
                <span className="oa-sleg oa-sleg-ta">TA</span>
                <span className="oa-sleg oa-sleg-nd">N/D</span>
              </div>
              <div className="oa-sched-grid">
                {c.schedule_in_range.map((day) => {
                  const clsMap = { FREE: 'free', BUSY: 'busy', BACKUP: 'busy', TA: 'ta', 'N/D': 'nd' };
                  const cls = clsMap[day.status] || 'nd';
                  const isSun = day.weekday === 'SUN';
                  return (
                    <div
                      key={day.date}
                      className={`oa-sched-cell oa-sched-${cls}${isSun ? ' oa-sched-sun' : ''}`}
                      title={`${day.date} (${day.weekday}): ${day.status}${day.cell ? ' · ' + day.cell : ''}`}
                    >
                      <span className="oa-sched-cell-day">{day.day}</span>
                      <span className="oa-sched-cell-wd">{day.weekday}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past skills */}
          {c.skills?.length > 0 && (
            <div className="oa-det-section">
              <div className="oa-det-sec-title">Past Skills &amp; Courses</div>
              <div className="oa-det-skills">
                {c.skills.map((s, i) => (
                  <span key={`${s}-${i}`} className={`oa-skill${(c.matched_terms || []).some((m) => s.toLowerCase().includes(m)) ? ' oa-skill-match' : ''}`}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fit score breakdown */}
          <div className="oa-det-section">
            <div className="oa-det-sec-title">
              Fit Score Breakdown — <span className={`oa-tbl-score oa-score-${tone}`} style={{ fontSize: '12px', height: '24px', minWidth: '34px', display: 'inline-grid' }}>{c.fit_score}</span>
            </div>
            <div className="oa-det-score-bars">
              {bars.map((b) => (
                <ScoreBar key={b.label} label={b.label} pts={b.pts} max={b.max} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactRow({ label, children }) {
  return (
    <div className="oa-det-contact-row">
      <span className="oa-det-contact-label">{label}</span>
      <span className="oa-det-contact-value">{children}</span>
    </div>
  );
}

function ScoreBar({ label, pts, max }) {
  const pct = max > 0 ? Math.round((pts / max) * 100) : 0;
  return (
    <div className="oa-score-bar-row">
      <div className="oa-score-bar-label">
        <span>{label}</span>
        <span className="oa-score-bar-pts">{pts} / {max}</span>
      </div>
      <div className="oa-score-bar-track">
        <div className="oa-score-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
