import { conflictKpis, activeConflicts, conflictProneDays, resolutionLogs, crossSkillsMap } from '../data/conflicts.js';

export default function Conflicts({ active }) {
  const renderKpiIcon = (type) => {
    switch (type) {
      case 'conflict':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
        );
      case 'resolved':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case 'clock':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case 'pending':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        );
      case 'auto':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-15-6.7L3 8" />
            <path d="M3 4v4h4" />
            <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" />
            <path d="M21 20v-4h-4" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="conflicts">
      {/* KPI strip */}
      <div className="kpi-strip">
        {conflictKpis.map((kpi, idx) => (
          <div className="kpi" key={idx}>
            <div className="kpi-icon" style={{ background: kpi.iconBg, color: kpi.iconColor }}>
              {renderKpiIcon(kpi.iconType)}
            </div>
            <div className="kpi-body">
              <div className="kpi-label">{kpi.label}</div>
              <div className={`kpi-value ${kpi.iconClass}`}>
                {kpi.value}
                {kpi.unit && <span className="unit">{kpi.unit}</span>}
              </div>
              <div className="kpi-trend">{kpi.trend}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="conflict-grid">
        {/* Left: Conflict cards */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ font: '800 11px/1 var(--font)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
              Active Conflicts · Sorted By Severity
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span className="chip neutral">ALL · 7</span>
              <span className="chip error">
                <span className="chip-dot"></span>CRITICAL · 3
              </span>
              <span className="chip warn">
                <span className="chip-dot"></span>WARNING · 4
              </span>
            </div>
          </div>

          {activeConflicts.map((conf) => (
            <div className={`conflict-card ${conf.cardClass}`} key={conf.id}>
              <div className="cc-head">
                <div className="cc-trainer">
                  <div className={`cc-avatar ${conf.avatarClass}`}>{conf.avatar}</div>
                  <div>
                    <div className="cc-name">{conf.name}</div>
                    <div className="cc-name-meta">{conf.meta}</div>
                  </div>
                </div>
                <span className={`cc-severity ${conf.severityClass}`}>
                  <span className="dot"></span>
                  {conf.severity}
                </span>
              </div>
              <div className="cc-versus">
                <div className="cc-leg">
                  <div className="cc-leg-id">{conf.leftLeg.id}</div>
                  <div className="cc-leg-name">{conf.leftLeg.name}</div>
                  <div className="cc-leg-meta">
                    {conf.leftLeg.meta.map((m, idx) => (
                      <span key={idx} className={idx === 0 ? "num" : undefined}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="cc-vs-icon">{conf.relation}</div>
                <div className="cc-leg">
                  <div className="cc-leg-id">{conf.rightLeg.id}</div>
                  <div className="cc-leg-name">{conf.rightLeg.name}</div>
                  <div className="cc-leg-meta">
                    {conf.rightLeg.meta.map((m, idx) => (
                      <span key={idx} className={idx === 0 ? "num" : undefined}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="cc-resolve">
                {conf.id === 1 && (
                  <div className="cc-resolve-text">
                    Suggested: Pull <strong>Surya K</strong> to LTIM-Bhub (P0, onsite), backfill SKI-100 with <strong>Vasudevan Badri (neo10371)</strong> + <strong>Bindhiya J (neo10457)</strong>. Skill match <span className="cm">94%</span>. <strong>Confidence 91%</strong>.
                  </div>
                )}
                {conf.id === 2 && (
                  <div className="cc-resolve-text">
                    Suggested: Reassign SKI-099 to <strong>Karunya Mohan (neo10396)</strong> — Python skill match <span className="cm">88%</span>, available days 12. Sahil keeps SKG-ML-S5 as Course Owner. <strong>Confidence 84%</strong>.
                  </div>
                )}
                {conf.id === 3 && (
                  <div className="cc-resolve-text">
                    No internal cyber-sec backup available. Suggested: extend LTM-001 by 5 days (no priority loss) so YK finishes SKG-CS-S6 first. Alternative: <strong>raise freelancer request</strong> for CySec mid-level. <strong>Confidence 67%</strong>.
                  </div>
                )}
                {conf.id === 4 && (
                  <div className="cc-resolve-text">
                    Long-duration program (16 wks). Suggested: pair Anshul with <strong>Abinaya P (neo10400)</strong> as primary instructor + Anshul as TA-lead for first 4 wks, ramp to co-lead. Reduces single-skill risk. <strong>Confidence 79%</strong>.
                  </div>
                )}
                {conf.id === 5 && (
                  <div className="cc-resolve-text">
                    Skill alignment <span className="cm">91%</span>. Move Abinaya to REC-001 with <strong>Bindhiya J</strong> + <strong>2 freelancers</strong>. Frees freelancer budget. <strong>Confidence 86%</strong>.
                  </div>
                )}
                <div className="cc-actions">
                  {conf.actions.map((act, actIdx) => (
                    <button
                      key={actIdx}
                      className={`cc-btn ${act === conf.primaryAction ? 'primary' : ''}`}
                    >
                      {act}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Conflict-prone days + Resolution log */}
        <div className="conflict-aside">
          <div className="conf-mini-card">
            <div className="cmh-title">Conflict-Prone Days · Next 30</div>
            <div className="confdays-list">
              {conflictProneDays.map((cDay, idx) => (
                <div className={`confday-row ${cDay.severity}`} key={idx}>
                  <span className="d">{cDay.day}</span>
                  <span className="lab">{cDay.desc}</span>
                  <span className="v">{cDay.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="conf-mini-card">
            <div className="cmh-title">Resolution Log · Last 48 Hrs</div>
            <div className="timeline-log">
              {resolutionLogs.map((log, idx) => (
                <div className="tl-row" key={idx}>
                  <span className="ts">{log.time}</span>
                  {idx === 0 && (
                    <span className="msg">
                      <span className={`tag ${log.statusClass}`}>{log.status}</span>
                      <strong>Aravindhan S</strong> moved KCT-008 → KCT-009. Auto-suggested, accepted.
                    </span>
                  )}
                  {idx === 1 && (
                    <span className="msg">
                      <span className={`tag ${log.statusClass}`}>{log.status}</span>
                      Hire request for <strong>SDET-Java</strong> raised to HR — JD ref HR-2026-0411.
                    </span>
                  )}
                  {idx === 2 && (
                    <span className="msg">
                      <span className={`tag ${log.statusClass}`}>{log.status}</span>
                      YK travel clash to <strong>Poomanirajan M</strong> for L1 review.
                    </span>
                  )}
                  {idx === 3 && (
                    <span className="msg">
                      <span className={`tag ${log.statusClass}`}>{log.status}</span>
                      Manoj Kumar reassigned from Parul-134 (closed) to KCT-009.
                    </span>
                  )}
                  {idx === 4 && (
                    <span className="msg">
                      <span className={`tag ${log.statusClass}`}>{log.status}</span>
                      <strong>2 freelancers</strong> onboarded against Cloud Azure .Net gap.
                    </span>
                  )}
                  {idx === 5 && (
                    <span className="msg">
                      <span className={`tag ${log.statusClass}`}>{log.status}</span>
                      SAP S/4HANA QC gap covered by Karan + Sai Deepak D Y rotation.
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="conf-mini-card">
            <div className="cmh-title">Cross-Skill Quick Map</div>
            <div className="lanes-row">
              {crossSkillsMap.map((lane, idx) => (
                <div className="lane" key={idx}>
                  <div className="lane-name">
                    {lane.path.split(' → ')[0]} → {lane.path.split(' → ')[1]}
                    <small>{lane.desc}</small>
                  </div>
                  <div className={`lane-bar ${lane.barClass}`}>
                    <i style={{ width: `${lane.percent}%` }}></i>
                  </div>
                  <div className={`lane-val ${lane.barClass}`}>{lane.percent}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
