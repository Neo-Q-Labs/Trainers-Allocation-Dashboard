import { useState, useEffect, useMemo } from 'react';
import { useSimulateRequirementMutation } from '../store/api.js';
import DatePicker from './DatePicker.jsx';
import Loader from './Loader.jsx';

const TYPE_COLOR = {
  FT: 'var(--neon-red)',
  SME: 'var(--neon-purple)',
  WILP: 'var(--wilp)',
  FREELANCER: 'var(--neon-yellow)',
};

const toIso = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const fmtRangeShort = (s, e) => {
  if (!s || !e) return '';
  const fmt = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };
  return `${fmt(s)} → ${fmt(e)}`;
};

export default function NewRequirementSimulator({ open, onClose }) {
  const today = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => toIso(today), [today]);
  const defaultEnd = useMemo(() => toIso(addDays(today, 6)), [today]);

  const [client, setClient] = useState('');
  const [techStack, setTechStack] = useState('');
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [demand, setDemand] = useState(1);          // # Trainers needed
  const [taDemand, setTaDemand] = useState(0);      // # TAs needed

  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [runSimulation, { isLoading: loading }] = useSimulateRequirementMutation();

  // Close on ESC, lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Reset state every time the modal closes so reopening starts clean
  useEffect(() => {
    if (!open) {
      setResult(null);
      setError(null);
    }
  }, [open]);

  const matched = result?.matched || [];
  const summary = result?.summary || null;
  const hasQuery = !!(summary && summary.has_query);

  // Group matched into Internal vs Freelancer (preserving sort order from API)
  const grouped = useMemo(() => {
    const g = { INTERNAL: [], FREELANCER: [] };
    matched.forEach((m) => {
      if (m.type === 'FREELANCER') g.FREELANCER.push(m);
      else g.INTERNAL.push(m);
    });
    return g;
  }, [matched]);

  if (!open) return null;

  const invalidDates = endDate < startDate;
  const totalDemand = Number(demand || 0) + Number(taDemand || 0);
  const invalidDemand = totalDemand < 1;
  const canSubmit = !loading && !invalidDates && !invalidDemand;

  const runSimulate = (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;
    setError(null);
    runSimulation({
      client: client.trim(),
      tech_stack: techStack.trim(),
      start_date: startDate,
      end_date: endDate,
      demand: Number(demand || 0),
      ta_demand: Number(taDemand || 0),
    })
      .unwrap()
      .then((payload) => {
        if (payload?.error) {
          throw new Error(payload.error === 'invalid_range' ? 'End date must be on or after start.' : 'Invalid input.');
        }
        setResult(payload);
      })
      .catch((err) => {
        setError(err?.data?.detail || err?.message || 'Simulation failed.');
      });
  };

  // Clear every input field back to its default + drop the previous result so
  // the planner can start a fresh "what-if" run. Next Simulate will still pull
  // from the live Trainer Data Live sheet — Reset only touches local form state.
  const resetForm = () => {
    setClient('');
    setTechStack('');
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setDemand(1);
    setTaDemand(0);
    setResult(null);
    setError(null);
  };

  const bannerTone = summary
    ? (summary.shortfall === 0 ? 'ok' : summary.coverable > 0 ? 'warn' : 'err')
    : 'idle';

  return (
    <div className="sim-backdrop" onClick={onClose}>
      <div className="sim-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="sim-head">
          <div className="sim-head-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <div>
            <div className="sim-title">New Requirement · Simulator</div>
            <div className="sim-subtitle">Available trainers for your client, tech stack &amp; date window</div>
          </div>
          <button className="sim-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>

        <form
          className="sim-form"
          onSubmit={(e) => { e.preventDefault(); runSimulate(); }}
        >
          <label className="sim-field sim-col-2">
            <span className="sim-label">CLIENT</span>
            <input
              type="text"
              className="sim-input"
              placeholder="LTI · KCT · Parul"
              value={client}
              onChange={(e) => setClient(e.target.value)}
            />
          </label>

          <label className="sim-field sim-col-2">
            <span className="sim-label">TECH STACK</span>
            <input
              type="text"
              className="sim-input"
              placeholder="Python, MERN, Java Full Stack…"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
            />
          </label>

          <div className="sim-field">
            <span className="sim-label">START</span>
            <DatePicker value={startDate} onChange={setStartDate} ariaLabel="Start date" />
          </div>

          <div className="sim-field">
            <span className="sim-label">END</span>
            <DatePicker value={endDate} onChange={setEndDate} ariaLabel="End date" />
          </div>

          <label className="sim-field">
            <span className="sim-label">TRAINERS</span>
            <input
              type="number"
              className="sim-input sim-num"
              min="0"
              value={demand}
              onChange={(e) => setDemand(e.target.value)}
            />
          </label>

          <label className="sim-field">
            <span className="sim-label">TAs</span>
            <input
              type="number"
              className="sim-input sim-num"
              min="0"
              value={taDemand}
              onChange={(e) => setTaDemand(e.target.value)}
            />
          </label>

          <div className="sim-form-actions sim-col-2">
            {invalidDates && <span className="sim-err">End ≥ start</span>}
            {!invalidDates && invalidDemand && <span className="sim-err">Set ≥ 1 trainer or TA</span>}
            {result && (
              <button
                type="button"
                className="sim-reset"
                onClick={resetForm}
                disabled={loading}
                title="Clear inputs and results"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Reset
              </button>
            )}
            <button
              type="button"
              className="sim-run"
              disabled={!canSubmit}
              onClick={runSimulate}
            >
              {loading ? 'Simulating…' : result ? 'Re-Simulate' : 'Simulate'}
            </button>
          </div>
        </form>

        <div className="sim-body">
          {error && <div className="sim-error-banner">{error}</div>}

          {!result && !loading && !error && (
            <div className="sim-empty">
              <div className="sim-empty-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <div className="sim-empty-text">
                Click <strong>Simulate</strong> to scan <strong>Trainer Data Live</strong> for trainers free every day in your range and matching the tech stack.
              </div>
            </div>
          )}

          {loading && (
            <div className="sim-empty" style={{ paddingTop: 24, paddingBottom: 24 }}>
              <Loader size="lg" label="Simulating coverage…" />
            </div>
          )}

          {result && (
            <>
              <div className={`sim-banner sim-banner-${bannerTone}`}>
                <div className="sim-banner-headline">
                  <span className="sim-banner-num">
                    {summary.coverable}
                  </span>
                  <span className="sim-banner-of">
                    /{summary.total_demand ?? summary.demand}
                  </span>
                  <span className="sim-banner-label">
                    {hasQuery ? 'skill-matched & available' : 'available'} for {fmtRangeShort(result.request.start_date, result.request.end_date)}
                  </span>
                </div>
                <div className="sim-banner-msg">{result.recommendation}</div>
                <div className="sim-banner-stats">
                  <span>
                    Need: <strong>{summary.demand}</strong> trainer{summary.demand === 1 ? '' : 's'}
                    {(summary.ta_demand ?? 0) > 0 && (
                      <> · <strong>{summary.ta_demand}</strong> TA{summary.ta_demand === 1 ? '' : 's'}</>
                    )}
                  </span>
                  <span><strong>{summary.eligible_internal}</strong> internal · <strong>{summary.eligible_freelancer}</strong> freelancer free for full range</span>
                  {hasQuery && (
                    <span><strong>{summary.skill_matched_internal}</strong> internal · <strong>{summary.skill_matched_freelancer}</strong> freelancer skill-matched</span>
                  )}
                  {result.request.query_tokens.length > 0 && (
                    <span className="sim-banner-tokens">
                      Skill tokens:
                      {result.request.query_tokens.map((tk) => (
                        <span key={tk} className="sim-token">{tk}</span>
                      ))}
                    </span>
                  )}
                </div>
              </div>

              {matched.length === 0 ? (
                <div className="sim-empty sim-empty-result">No trainers free across the entire range. Try a narrower window.</div>
              ) : (
                <div className="sim-groups">
                  {['INTERNAL', 'FREELANCER'].map((pool) => {
                    const list = grouped[pool];
                    if (list.length === 0) return null;
                    const label = pool === 'INTERNAL' ? 'Internal pool · FT / SME / WILP' : 'Freelancer pool';
                    return (
                      <div key={pool} className="sim-group">
                        <div className="sim-group-head">
                          <span className="sim-group-name">{label}</span>
                          <span className="sim-group-count">{list.length}</span>
                        </div>
                        <div className="sim-list">
                          {list.map((m, idx) => (
                            <div key={`${pool}-${m.employee_id || ''}-${m.name}-${idx}`} className={`sim-row${m.skill_match ? ' is-matched' : ''}`}>
                              <span className="sim-initial" style={{ background: TYPE_COLOR[m.type] || 'var(--text-muted)' }}>
                                {(m.name || '?').trim().charAt(0).toUpperCase()}
                              </span>
                              <div className="sim-row-meta">
                                <div className="sim-row-name">
                                  {m.name}
                                  {m.skill_match && <span className="sim-match-chip">MATCH</span>}
                                </div>
                                <div className="sim-row-sub">
                                  <span style={{ color: TYPE_COLOR[m.type] }}>{m.type_raw || m.type}</span>
                                  {m.vendor && m.vendor !== 'NA' && (
                                    <>
                                      <span className="dot-sep">·</span>
                                      <span>{m.vendor}</span>
                                    </>
                                  )}
                                  {m.employee_id && (
                                    <>
                                      <span className="dot-sep">·</span>
                                      <span>{m.employee_id}</span>
                                    </>
                                  )}
                                  <span className="dot-sep">·</span>
                                  <span>{m.past_engagement_count} past days</span>
                                </div>
                                {m.past_courses.length > 0 && (
                                  <div className="sim-row-courses">
                                    {m.past_courses.slice(0, 5).map((c) => {
                                      const lc = c.toLowerCase();
                                      const isMatchCourse = (m.matched_terms || []).some((q) => lc.includes(q));
                                      return (
                                        <span key={c} className={`sim-course${isMatchCourse ? ' is-match' : ''}`}>{c}</span>
                                      );
                                    })}
                                    {m.past_courses.length > 5 && (
                                      <span className="sim-course sim-course-more">+{m.past_courses.length - 5} more</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <span
                                className="sim-row-chip"
                                style={{ '--cat-color': TYPE_COLOR[m.type] }}
                              >
                                {m.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <footer className="sim-foot">
          <button type="button" className="sim-foot-ghost" onClick={onClose}>Close</button>
          {result && (
            <button
              type="button"
              className="sim-foot-primary"
              disabled={!summary || summary.coverable === 0}
              onClick={() => {
                window.qlabs?.showToast?.(
                  'Requirement noted',
                  `${summary.coverable} matched trainer(s) for ${result.request.client || 'this client'} · simulation only — not yet written to Excel.`,
                  'info'
                );
                onClose?.();
              }}
            >
              Save Requirement
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
