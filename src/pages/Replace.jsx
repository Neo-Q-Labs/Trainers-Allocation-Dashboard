import { replacementCases, swapHistory } from '../data/replace.js';

export default function Replace({ active }) {
  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="replace">
      <div className="callout" style={{ marginBottom: '18px' }}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <div className="callout-title">How this works</div>
        <div className="callout-body">
          The Replacement Engine looks at every trainer whose schedule is in trouble and proposes the smallest possible swap.{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            Each case shows you the <em>trigger</em> (why the swap is needed), the <em>swap chain</em> (who moves where), and the <em>net impact</em> (what changes for the team).
          </strong>{' '}
          Accept it, override it, or escalate.
        </div>
      </div>

      {/* 3 active replacement cases */}
      <div className="replace-cases">
        {replacementCases.map((rc) => (
          <div key={rc.id} className={`rc-case ${rc.severityClass}`}>
            <div className="rc-header">
              <div className="rc-num">{rc.caseNum}</div>
              <div className={`rc-status ${rc.id === 2 ? 'warn' : rc.id === 3 ? 'info' : ''}`}>
                <span className="rc-dot"></span>
                {rc.severity}
              </div>
            </div>

            <div className="rc-grid">
              {/* Trigger */}
              <div className="rc-step rc-trigger">
                <div className="rc-step-head">
                  <div className="rc-step-icon">
                    {rc.id === 3 ? (
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    )}
                  </div>
                  <div className="rc-step-label">{rc.id === 3 ? 'TRIGGER · Optimisation candidate' : 'TRIGGER · Why we need a swap'}</div>
                </div>
                <div className="rc-step-body">
                  {rc.id === 1 && (
                    <div className="rc-line">
                      <strong>Surya K</strong> is double-booked between <strong>LTIM-Bhub-024</strong> (SDET-Java, ongoing) and <strong>Parul-135</strong> (DSA, starting 1 Jun).
                    </div>
                  )}
                  {rc.id === 2 && (
                    <div className="rc-line">
                      <strong>Sahil Deswal</strong> (ML track owner) approved 5-day leave from 10–14 Jun. <strong>SKG-ML-S5</strong> batch starts 10 Jun.
                    </div>
                  )}
                  {rc.id === 3 && (
                    <div className="rc-line">
                      <strong>Anshul Mishra</strong> (89% load) is currently solo on <strong>Parul-134</strong> while <strong>Manopalaniraja A</strong> is at 22% with same track skills.
                    </div>
                  )}
                  <div className="rc-meta">
                    {rc.trigger.meta.map((m, idx) => (
                      <span key={idx} className="meta-pair">
                        <span className="lab">{m.label}</span>
                        {m.label === 'Current load' ? (
                          <span style={m.valueStyle}>{m.value}</span>
                        ) : (
                          m.value
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rc-arrow">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="5 12 19 12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>

              {/* Swap chain */}
              <div className="rc-step rc-chain">
                <div className="rc-step-head">
                  <div className="rc-step-icon">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 0 0-15-6.7L3 8" />
                      <path d="M3 4v4h4" />
                      <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" />
                      <path d="M21 20v-4h-4" />
                    </svg>
                  </div>
                  <div className="rc-step-label">SWAP CHAIN · {rc.swapChain.hops}</div>
                </div>
                <div className="rc-step-body">
                  {rc.swapChain.steps.map((step, idx) => (
                    <div className="rc-chain-step" key={idx}>
                      <div className="hop-num">{step.label}</div>
                      <div className="hop-body">
                        {rc.id === 1 && idx === 0 && (
                          <div><strong>Surya K</strong> stays on <strong>LTIM-Bhub-024</strong> till 19 Jun</div>
                        )}
                        {rc.id === 1 && idx === 1 && (
                          <div><strong>Vasudevan Badri</strong> moves from bench → <strong>Parul-135 (DSA)</strong></div>
                        )}
                        {rc.id === 1 && idx === 2 && (
                          <div><strong>Surya K</strong> joins <strong>Parul-135</strong> from 20 Jun</div>
                        )}
                        {rc.id === 2 && idx === 0 && (
                          <div><strong>Karunya Mohan</strong> covers <strong>SKG-ML-S5</strong> Days 1–5</div>
                        )}
                        {rc.id === 2 && idx === 1 && (
                          <div><strong>Sahil Deswal</strong> resumes from 15 Jun (Day 6)</div>
                        )}
                        {rc.id === 3 && idx === 0 && (
                          <div>Add <strong>Manopalaniraja A</strong> as co-anchor on Parul-134</div>
                        )}
                        {rc.id === 3 && idx === 1 && (
                          <div><strong>Anshul</strong> shifts 40% session load to Manopalaniraja</div>
                        )}
                        <div className="hop-sub">{step.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rc-arrow">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="5 12 19 12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>

              {/* Net impact */}
              <div className="rc-step rc-impact">
                <div className="rc-step-head">
                  <div className="rc-step-icon">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </div>
                  <div className="rc-step-label">NET IMPACT · What changes</div>
                </div>
                <div className="rc-step-body">
                  {rc.impact.rows.map((row, idx) => (
                    <div className="impact-row" key={idx}>
                      <span className="il">{row.label}</span>
                      <span className={`iv ${row.isOk ? 'ok' : row.isWarn ? 'warn' : ''}`}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rc-actions">
              {rc.actions.map((act, actIdx) => (
                <button
                  key={actIdx}
                  className={`btn-${act.isPrimary ? 'primary' : 'ghost'} cc-btn`}
                >
                  {act.label}
                </button>
              ))}
              <span className="rc-meta-right">{rc.footerMeta}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 48-hour swap log */}
      <div className="card" style={{ marginTop: '18px' }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Swap History · last 48h
            </div>
            <div className="section-sub" style={{ marginTop: '6px' }}>
              Every replacement that's been accepted, with full audit trail
            </div>
          </div>
        </div>
        <div className="swap-log">
          {swapHistory.map((entry, idx) => (
            <div className="sl-entry" key={idx}>
              <div className="sl-time">{entry.time}</div>
              {idx === 0 && (
                <div className="sl-body">
                  <strong>Bandewar Sai Raghavendra</strong> → covers <strong>HEX-B3</strong> for 2 days · accepted by Karan D
                </div>
              )}
              {idx === 1 && (
                <div className="sl-body">
                  <strong>Keerthipati Sowmya</strong> moves from <strong>VIT-WILP</strong> → <strong>Parul-MBA-HR</strong> kickoff · accepted by Poomanirajan M
                </div>
              )}
              {idx === 2 && (
                <div className="sl-body">
                  <strong>Abinaya P</strong> backfill on <strong>Parul-134</strong> rejected · escalated to Ramesh Berkmans
                </div>
              )}
              {idx === 3 && (
                <div className="sl-body">
                  <strong>Jenifer Rohini R</strong> &amp; <strong>Sahil Deswal</strong> co-anchor swap on <strong>SKG-ML</strong> · accepted
                </div>
              )}
              <div className={`sl-tag ${entry.tagClass}`}>
                <span className="dot"></span>
                {entry.tag}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
