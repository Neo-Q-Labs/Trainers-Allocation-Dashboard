import { useMemo, useState, useEffect, useRef } from 'react';
import {
  useGetOasisOptionsQuery,
  useAssessOpportunityMutation,
} from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';

/* ============================================================
   OASIS · Opportunity Assessment & Staffing Index
   ------------------------------------------------------------
   Plug-in form + live capacity assessment. Form drops feed
   from /oasis/options; assessment runs through /oasis/assess
   and returns ranked candidates with fit scores, bucket
   counts, and partial-availability sub-ranges. Every datum
   comes from the live Trainer Data Live + Request ID Track
   sheets — no mock fallbacks.
   ============================================================ */

const toIso = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

// Quick-range presets — clicking sets the From/To fields. FY27 uses the
// Indian fiscal calendar (Apr 1 2026 → Mar 31 2027).
const presetRange = (key) => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (key === '7D') {
    const end = new Date(start); end.setDate(end.getDate() + 6);
    return { from: toIso(start), to: toIso(end) };
  }
  if (key === '1M') {
    const end = new Date(start); end.setMonth(end.getMonth() + 1);
    return { from: toIso(start), to: toIso(end) };
  }
  if (key === '3M') {
    const end = new Date(start); end.setMonth(end.getMonth() + 3);
    return { from: toIso(start), to: toIso(end) };
  }
  if (key === 'FY27') {
    return { from: '2026-04-01', to: '2027-03-31' };
  }
  return null;
};

const PRESET_KEYS = ['7D', '1M', '3M', 'FY27'];

// Initial period when the user lands on the page = 1M from today.
const defaultRange = () => presetRange('1M');

// Avatar gradient pool — assigned deterministically by name so colours stay
// stable across re-renders (matches the design palette).
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
const initials = (name) => (name || '?')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((w) => w[0].toUpperCase())
  .join('');

// "Internal SME" / "Freelancer · Bench" — composed from type + vendor /
// type_raw. Used in the candidate card sub-line.
const formatPool = (c) => {
  if (!c.is_internal) {
    const bench = (c.vendor || '').toLowerCase().includes('bench') || c.type_raw?.toLowerCase().includes('bench');
    return bench ? 'Freelancer · Bench' : (c.vendor ? `Freelancer · ${c.vendor}` : 'Freelancer');
  }
  if (c.type === 'SME')  return 'Internal SME';
  if (c.type === 'WILP') return 'Internal WILP';
  return 'Internal Fulltime';
};

const STATUS_TONE = {
  fully_achievable: 'ok',
  partial:          'warn',
  needs_swap:       'warn',
  needs_hire:       'bad',
  info:             'info',
};

export default function Oasis({ active }) {
  const def = useMemo(defaultRange, []);

  // ----- Form state ---------------------------------------------------------
  const [delivery, setDelivery]         = useState('');
  const [client, setClient]             = useState('');
  const [track, setTrack]               = useState('');
  const [from, setFrom]                 = useState(def.from);
  const [to, setTo]                     = useState(def.to);
  const [trainers, setTrainers]         = useState(5);
  const [activePreset, setActivePreset] = useState('1M');

  // Drop preset highlight when the user manually edits a date.
  useEffect(() => {
    if (!activePreset) return;
    const pr = presetRange(activePreset);
    if (!pr) return;
    if (pr.from !== from || pr.to !== to) setActivePreset(null);
  }, [from, to, activePreset]);

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

  // Auto-pick first values when options arrive so the form is never empty.
  useEffect(() => {
    if (opts?.clients?.length && !client) setClient(opts.clients[0]);
  }, [opts, client]);
  useEffect(() => {
    if (opts?.primary_tracks?.length && !track) setTrack(opts.primary_tracks[0]);
  }, [opts, track]);

  const dateInvalid = !!from && !!to && from > to;
  const formValid = !!from && !!to && !dateInvalid && Number(trainers) >= 0;

  const handlePreset = (key) => {
    const pr = presetRange(key);
    if (!pr) return;
    setFrom(pr.from);
    setTo(pr.to);
    setActivePreset(key);
  };

  const handleSimulate = async () => {
    if (!formValid || assessing) return;
    await assess({
      delivery_name: delivery,
      client,
      primary_track: track,
      start_date: from,
      end_date: to,
      demand: Number(trainers) || 0,
    }).unwrap().catch(() => {});
  };

  const handleReset = () => {
    setDelivery('');
    setClient(opts?.clients?.[0] || '');
    setTrack(opts?.primary_tracks?.[0] || '');
    const pr = defaultRange();
    setFrom(pr.from);
    setTo(pr.to);
    setTrainers(5);
    setActivePreset('1M');
    resetAssess();
  };

  // Export current candidate ranking as CSV.
  const candidateRef = useRef(null);
  const handleExport = () => {
    if (!result?.candidates?.length) return;
    const rows = [
      ['Rank', 'Name', 'Employee ID', 'Pool', 'Fit Score', 'Bucket', 'Availability', 'Skills'],
      ...result.candidates.map((c, i) => [
        i + 1,
        c.name,
        c.employee_id,
        formatPool(c),
        c.fit_score,
        c.bucket,
        c.avail_label || '',
        (c.skills || []).join(' / '),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `oasis-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const scrollToCandidates = () => {
    candidateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      {/* OASIS-local sub-toolbar — range presets + search hint + export */}
      <div className="oa-toolbar">
        <div className="oa-toolbar-spacer" />
        <div className="oa-presets" role="tablist" aria-label="Quick date range">
          {PRESET_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={activePreset === k}
              className={`oa-preset${activePreset === k ? ' is-active' : ''}`}
              onClick={() => handlePreset(k)}
            >
              {k}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="oa-tool-btn"
          onClick={() => window.qlabs?.openCmdk?.()}
          title="Open command palette"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          SEARCH
          <span className="oa-tool-kbd">⌘K</span>
        </button>
        <button
          type="button"
          className="oa-tool-btn"
          onClick={handleExport}
          disabled={!result?.candidates?.length}
          title={result ? 'Export current candidates as CSV' : 'Run a simulation first'}
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
              Opportunity Assessment &amp; Staffing Index — plug in any new requirement and instantly check feasibility against the live roster
            </div>
          </div>
          <span className="oa-pill oa-pill-warn">
            <span className="oa-dot" />
            SIMULATION ONLY — NOT SAVED
          </span>
        </header>

        <div className="oa-form">
          <Field label="DELIVERY NAME" className="oa-f-delivery">
            <input
              type="text"
              className="oa-input"
              placeholder="e.g. LTI Mumbai · JAVA FS Pilot Batch"
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
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
              onChange={(e) => setTrainers(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
          </Field>

          <div className="oa-f-actions">
            <button
              type="button"
              className="oa-btn-reset"
              onClick={handleReset}
              disabled={assessing}
              title="Clear simulation"
            >
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
                  <strong>{result.summary.trainers_requested}</strong> trainers requested
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
              <Metric tone="ok"      label="FULL AVAILABILITY"     value={result.summary.full_availability}   note={result.summary.full_availability_label} />
              <Metric tone="warn"    label="STAGGERED FITS"        value={result.summary.staggered_fits}      note={result.summary.staggered_fits_label} />
              <Metric tone="neutral" label="REPLACEMENT OPENS"     value={result.summary.replacement_opens}   note={result.summary.replacement_opens_label} />
              <Metric tone="neutral" label="HIRE RECOMMENDATION"   value={result.summary.hire_recommendation} note={result.summary.hire_recommendation_label} />
            </div>

            {/* Ranked candidates */}
            <div className="oa-cands" ref={candidateRef}>
              <div className="oa-cands-head">
                <div className="oa-cands-title">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  TRAINER CANDIDATES · RANKED
                </div>
                <div className="oa-cands-legend">
                  <span className="oa-leg oa-leg-int"><span className="oa-leg-dot" /> INTERNAL POOL FIRST</span>
                  <span className="oa-leg oa-leg-frl"><span className="oa-leg-dot" /> FREELANCER BENCH SECOND</span>
                </div>
              </div>

              {result.candidates.length === 0 ? (
                <div className="oa-empty">No matching trainers for the requested track and date range.</div>
              ) : (
                <div className="oa-cand-grid">
                  {result.candidates.map((c, i) => (
                    <CandidateCard key={`${c.employee_id || ''}-${c.name}-${i}`} c={c} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* ----- form helpers ----- */

function Field({ label, className = '', error, children }) {
  return (
    <div className={`oa-field ${className}`}>
      <label className="oa-label">{label}</label>
      {children}
      {error && <div className="oa-field-err">{error}</div>}
    </div>
  );
}

/* Self-rolled select — looks identical to the design's dark dropdown and
   supports an optional type-ahead search for long lists (primary tracks).
*/
function ListSelect({ value, options, onChange, placeholder, ariaLabel, searchable = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search, searchable]);

  return (
    <div ref={ref} className={`oa-select${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="oa-select-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
      >
        <span className={`oa-select-value${value ? '' : ' is-placeholder'}`}>
          {value || placeholder || 'Select…'}
        </span>
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="oa-select-caret">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="oa-select-menu">
          {searchable && (
            <div className="oa-select-search">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
              />
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

function CandidateCard({ c }) {
  const tone =
    c.bucket === 'full' ? (c.is_internal ? 'fit' : 'frl-fit')
      : c.bucket === 'staggered' ? 'partial'
      : 'replace';

  return (
    <div className={`oa-cand oa-cand-${tone}`}>
      <div className="oa-cand-avatar" style={{ background: pickAvatar(c.name) }}>
        {initials(c.name)}
      </div>
      <div className="oa-cand-body">
        <div className="oa-cand-name" title={c.name}>{c.name || '—'}</div>
        <div className="oa-cand-meta">
          {c.employee_id && <span className="oa-cand-id">{c.employee_id}</span>}
          <span className="oa-cand-pool">{formatPool(c)}</span>
        </div>
        {c.skills?.length > 0 && (
          <div className="oa-cand-skills">
            {c.skills.slice(0, 3).map((s, i) => (
              <span key={`${s}-${i}`} className="oa-skill">{s}</span>
            ))}
          </div>
        )}
      </div>
      <div className="oa-cand-score">
        <div className={`oa-cand-score-num oa-score-${tone}`}>{c.fit_score}</div>
        <div className={`oa-cand-score-label oa-score-label-${tone}`}>
          {c.avail_label}
        </div>
      </div>
    </div>
  );
}
