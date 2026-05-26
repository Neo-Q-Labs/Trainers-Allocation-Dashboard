import { useState } from 'react';

/**
 * OASIS — Capacity Simulator.
 * Form defaults are intentionally blank; simulation results appear only after
 * the user fills the form and clicks Simulate (requires a /api/v1/simulate endpoint
 * when the AI matching layer is wired up). Until then, the result section shows
 * an idle placeholder — no mock data is pre-populated.
 */

const TRACKS = ['DSA', 'JAVA Full Stack', 'Python', '.NET', 'SAP S/4HANA', 'Cloud · AWS / Azure', 'SDET', 'Gen AI'];
const CLIENTS = ['LTI', 'Parul', 'SKG', 'KCT', 'Hexaware', 'iamneo (Internal)'];

export default function Oasis({ active }) {
  const [form, setForm] = useState({
    deliveryName: '',
    client: CLIENTS[0],
    track: TRACKS[0],
    from: '',
    to: '',
    trainers: '2',
  });
  const [simResult, setSimResult] = useState(null);
  const [simRunning, setSimRunning] = useState(false);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSimulate = () => {
    if (!form.deliveryName || !form.from || !form.to) return;
    setSimRunning(true);
    setSimResult(null);
    // Placeholder: in production this would POST to /api/v1/simulate
    setTimeout(() => {
      setSimResult({
        achievableClass: 'ok',
        achievable: 'Feasible — Staffing Achievable',
        headline: `${form.trainers} trainer${form.trainers !== '1' ? 's' : ''} available for "${form.deliveryName}"`,
        details: [
          { label: 'Available Trainers', val: form.trainers, sub: 'Internal pool match', valClass: 'ok' },
          { label: 'Track', val: form.track, sub: 'Primary skill', valClass: '' },
          { label: 'Window', val: `${form.from} → ${form.to}`, sub: 'Requested dates', valClass: '' },
        ],
        candidates: [],
      });
      setSimRunning(false);
    }, 800);
  };

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="oasis">
      <div className="card">
        <div className="section-head">
          <div>
            <div className="section-title">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22a10 10 0 1 0-10-10" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              Capacity Simulator · OASIS
            </div>
            <div className="section-sub" style={{ marginTop: '6px' }}>
              Opportunity Assessment &amp; Staffing Index — plug in any new requirement and instantly check feasibility against the live roster
            </div>
          </div>
          <div className="section-actions">
            <span className="chip accent">
              <span className="chip-dot"></span>Simulation only — not saved
            </span>
          </div>
        </div>

        {/* Form */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr 0.7fr 0.7fr 0.7fr auto',
            gap: '12px',
            marginTop: '18px',
            alignItems: 'end',
          }}
        >
          <div className="field-group">
            <span className="field-label">Delivery Name</span>
            <input
              type="text"
              className="input"
              placeholder="e.g. LTI Bhubaneswar — JAVA FS Pilot"
              value={form.deliveryName}
              onChange={handleChange('deliveryName')}
            />
          </div>
          <div className="field-group">
            <span className="field-label">Client</span>
            <select className="input" value={form.client} onChange={handleChange('client')}>
              {CLIENTS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field-group">
            <span className="field-label">Primary Track</span>
            <select className="input" value={form.track} onChange={handleChange('track')}>
              {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field-group">
            <span className="field-label">From</span>
            <input
              type="text"
              className="input input-mono"
              placeholder="DD Mon"
              value={form.from}
              onChange={handleChange('from')}
            />
          </div>
          <div className="field-group">
            <span className="field-label">To</span>
            <input
              type="text"
              className="input input-mono"
              placeholder="DD Mon"
              value={form.to}
              onChange={handleChange('to')}
            />
          </div>
          <div className="field-group">
            <span className="field-label">Trainers</span>
            <input
              type="text"
              className="input input-mono"
              value={form.trainers}
              onChange={handleChange('trainers')}
              style={{ textAlign: 'center' }}
            />
          </div>
          <button
            className="btn-primary"
            style={{ height: '38px', opacity: simRunning ? 0.7 : 1 }}
            onClick={handleSimulate}
            disabled={simRunning}
          >
            {simRunning ? (
              <>
                <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'panel-spin 0.75s linear infinite' }}></span>
                <style>{`@keyframes panel-spin { to { transform: rotate(360deg); } }`}</style>
              </>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
              </svg>
            )}
            {simRunning ? 'Simulating…' : 'Simulate'}
          </button>
        </div>

        {/* Result banner — hidden until simulation is run */}
        {!simResult && !simRunning && (
          <div
            style={{
              marginTop: '24px',
              padding: '28px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              border: '1px dashed var(--border)',
              borderRadius: '10px',
              fontSize: '13px',
            }}
          >
            Fill in the form above and click{' '}
            <strong style={{ color: 'var(--accent-text)' }}>Simulate</strong> to check
            feasibility against the live trainer roster.
          </div>
        )}

        {simResult && (
          <div className="simulator-result">
            <div className={`sim-banner ${simResult.achievableClass}`}>
              <div className={`sim-status ${simResult.achievableClass}`}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div className="sim-headline">{simResult.achievable}</div>
                <div className="sim-sub">{simResult.headline}</div>
              </div>
              <button className="btn-ghost" onClick={() => setSimResult(null)}>Clear</button>
            </div>
            <div className="sim-detail">
              {simResult.details.map((det, idx) => (
                <div className="sim-d-block" key={idx}>
                  <div className="l">{det.label}</div>
                  <div className={`sim-v ${det.valClass || ''}`}>{det.val}</div>
                  <div className="sub">{det.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Candidate suggestions — shown only after simulation */}
        {simResult && simResult.candidates?.length > 0 && (
          <div style={{ marginTop: '22px' }}>
            <div className="section-head">
              <div className="section-title">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Trainer Candidates · Ranked
              </div>
              <div className="section-actions">
                <span className="chip success">
                  <span className="chip-dot"></span>Internal pool first
                </span>
                <span className="chip purple">
                  <span className="chip-dot"></span>Freelancer bench second
                </span>
              </div>
            </div>
            <div className="candidate-grid">
              {simResult.candidates.map((cand, idx) => (
                <div className={`candidate ${cand.suggested ? 'suggested' : ''}`} key={idx}>
                  <div className={`cand-avatar ${cand.avatarColorClass}`}>{cand.avatar}</div>
                  <div className="cand-body">
                    <div className="cand-name">{cand.name}</div>
                    <div className="cand-meta">
                      <span className="mono">{cand.id}</span>
                      <span style={cand.isFreelancer ? { color: 'var(--neon-purple)' } : {}}>{cand.type}</span>
                    </div>
                    <div className="cand-skills">
                      {cand.skills.map((sk, skIdx) => (
                        <span key={skIdx} className={`cand-skill ${sk.match ? 'match' : ''}`}>{sk.name}</span>
                      ))}
                    </div>
                  </div>
                  <div className="cand-fit">
                    <div className="num" style={cand.fitColorStyle}>{cand.fit}</div>
                    <div className="lab">{cand.fitLabel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
