import { oasisFormDefaults, simulatorResult, candidateSuggestions } from '../data/oasis.js';

export default function Oasis({ active }) {
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
            alignItems: 'end'
          }}
        >
          <div className="field-group">
            <span className="field-label">Delivery Name</span>
            <input
              type="text"
              className="input"
              placeholder="e.g. LTI Bhubaneswar — JAVA FS Pilot"
              defaultValue={oasisFormDefaults.deliveryName}
            />
          </div>
          <div className="field-group">
            <span className="field-label">Client</span>
            <select className="input" defaultValue={oasisFormDefaults.client}>
              <option value="LTI">LTI</option>
              <option value="Parul">Parul</option>
              <option value="SKG">SKG</option>
              <option value="KCT">KCT</option>
              <option value="Hexaware">Hexaware</option>
              <option value="iamneo">iamneo (Internal)</option>
            </select>
          </div>
          <div className="field-group">
            <span className="field-label">Primary Track</span>
            <select className="input" defaultValue={oasisFormDefaults.track}>
              <option value="DSA">DSA</option>
              <option value="JAVA Full Stack">JAVA Full Stack</option>
              <option value="Python">Python</option>
              <option value=".NET">.NET</option>
              <option value="SAP S/4HANA">SAP S/4HANA</option>
              <option value="Cloud · AWS / Azure">Cloud · AWS / Azure</option>
              <option value="SDET">SDET</option>
              <option value="Gen AI">Gen AI</option>
            </select>
          </div>
          <div className="field-group">
            <span className="field-label">From</span>
            <input type="text" className="input input-mono" defaultValue={oasisFormDefaults.from} />
          </div>
          <div className="field-group">
            <span className="field-label">To</span>
            <input type="text" className="input input-mono" defaultValue={oasisFormDefaults.to} />
          </div>
          <div className="field-group">
            <span className="field-label">Trainers</span>
            <input
              type="text"
              className="input input-mono"
              defaultValue={oasisFormDefaults.trainers}
              style={{ textAlign: 'center' }}
            />
          </div>
          <button className="btn-primary" style={{ height: '38px' }}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
            </svg>
            Simulate
          </button>
        </div>

        {/* Result banner */}
        <div className="simulator-result">
          <div className={`sim-banner ${simulatorResult.achievableClass}`}>
            <div className={`sim-status ${simulatorResult.achievableClass}`}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div className="sim-headline">{simulatorResult.achievable}</div>
              <div className="sim-sub">{simulatorResult.headline}</div>
            </div>
            <button className="btn-ghost">View detail</button>
          </div>
          <div className="sim-detail">
            {simulatorResult.details.map((det, idx) => (
              <div className="sim-d-block" key={idx}>
                <div className="l">{det.label}</div>
                <div className={`sim-v ${det.valClass || ''}`}>{det.val}</div>
                <div className="sub">{det.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Candidate suggestions */}
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
            {candidateSuggestions.map((cand, idx) => (
              <div className={`candidate ${cand.suggested ? 'suggested' : ''}`} key={idx}>
                <div className={`cand-avatar ${cand.avatarColorClass}`}>
                  {cand.avatar}
                </div>
                <div className="cand-body">
                  <div className="cand-name">{cand.name}</div>
                  <div className="cand-meta">
                    <span className="mono">{cand.id}</span>
                    {cand.isFreelancer ? (
                      <span style={{ color: 'var(--neon-purple)' }}>{cand.type}</span>
                    ) : (
                      <span>{cand.type}</span>
                    )}
                  </div>
                  <div className="cand-skills">
                    {cand.skills.map((sk, skIdx) => (
                      <span
                        key={skIdx}
                        className={`cand-skill ${sk.match ? 'match' : ''}`}
                      >
                        {sk.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="cand-fit">
                  <div className="num" style={cand.fitColorStyle}>
                    {cand.fit}
                  </div>
                  <div className="lab">{cand.fitLabel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
