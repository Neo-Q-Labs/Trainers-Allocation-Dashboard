import { pendingKpis, pendingSlots } from '../data/pending.js';

export default function Pending({ active }) {
  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="pending">
      {/* KPI strip */}
      <div className="kpi-strip">
        {pendingKpis.map((kpi, idx) => (
          <div className="kpi" key={idx}>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value" style={kpi.style}>
              {kpi.value}
            </div>
            <div className="kpi-sub">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Pending allocation list */}
      <div className="card" style={{ marginTop: '18px' }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Slots Awaiting a Trainer
            </div>
            <div className="section-sub" style={{ marginTop: '6px' }}>
              Sorted by urgency · auto-pulled from Request ID Track
            </div>
          </div>
          <div className="section-actions">
            <div className="range-segment">
              <button className="active">All</button>
              <button>Urgent</button>
              <button>This Week</button>
              <button>This Month</button>
            </div>
          </div>
        </div>

        <div className="pending-list">
          {pendingSlots.map((slot, idx) => (
            <div key={idx} className={`pending-card ${slot.isUrgent ? 'urgent' : ''}`}>
              <div className="pending-head">
                <div>
                  <div className="pending-prog">
                    <span className="prog-badge">{slot.id}</span>
                    <span className="prog-name">{slot.name}</span>
                  </div>
                  <div className="pending-meta">
                    <span className="meta-pair">
                      <span className="lab">Client</span>
                      {slot.client}
                    </span>
                    <span className="meta-pair">
                      <span className="lab">Window</span>
                      {slot.window}
                    </span>
                    <span className="meta-pair">
                      <span className="lab">Track</span>
                      {slot.track}
                    </span>
                  </div>
                </div>
                <div className="pending-gap-ind">
                  <div className="gap-num">{slot.gap}</div>
                  <div className="gap-lab">{slot.gapLabel}</div>
                </div>
              </div>
              <div className="pending-progress">
                <div className={`pending-bar ${slot.progressClass}`}>
                  <i style={{ width: `${slot.percent}%` }}></i>
                </div>
                <div className="pending-num">
                  {slot.filled} / {slot.total} filled
                </div>
              </div>
              <div className="pending-suggested">
                <div className="ps-label">{slot.suggestedLabel}</div>
                <div className="ps-chips">
                  {slot.chips.map((chip, chipIdx) => (
                    <span key={chipIdx} className="ps-chip">
                      {chip}
                    </span>
                  ))}
                  {slot.hasAlt && (
                    <span className="ps-chip alt">{slot.altChip}</span>
                  )}
                </div>
              </div>
              <div className="pending-actions">
                {slot.actionsType === 'replace' ? (
                  <>
                    <button className="btn-primary" data-action="auto-fill">Auto-fill</button>
                    <button className="btn-ghost" data-action="open-replace">Run Replacement Engine</button>
                    <button className="btn-ghost" data-action="hire-req">Hire (Freelancer)</button>
                  </>
                ) : (
                  <>
                    <button className="btn-primary" data-action="auto-fill">Auto-fill from suggested</button>
                    <button className="btn-ghost" data-action="manual-pick">Manual Pick</button>
                    <button className="btn-ghost" data-action="hire-req">Hire (Freelancer)</button>
                  </>
                )}
              </div>
              <div className={`pending-urgency ${slot.urgencyClass}`}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {slot.isUrgent ? (
                  <>
                    <strong>0 days</strong> to start · highest priority
                  </>
                ) : slot.id === 'Parul-135' ? (
                  <>
                    <strong>10 days</strong> to start
                  </>
                ) : slot.id === 'LTIM-Bhub-024' ? (
                  <>
                    <strong>17 days</strong> to start
                  </>
                ) : (
                  <>
                    <strong>31 days</strong> to start
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
