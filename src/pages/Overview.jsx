import { overviewKpis, suggestedActions, trackCoverages } from '../data/overview.js';

export default function Overview({ active }) {
  const renderKpiIcon = (type) => {
    switch (type) {
      case 'requirements':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        );
      case 'trainers':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="7" r="4" />
            <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      case 'complete':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case 'gap':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
        );
      case 'distribution':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderDeltaIcon = (type) => {
    if (type === 'up') {
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 11 12 6 7 11" />
          <polyline points="17 18 12 13 7 18" />
        </svg>
      );
    } else if (type === 'down') {
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 13 12 18 7 13" />
        </svg>
      );
    }
    return null;
  };

  const renderSuggestedActionIcon = (type) => {
    switch (type) {
      case 'warning':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
        );
      case 'replace':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-15-6.7L3 8" />
            <path d="M3 4v4h4" />
          </svg>
        );
      case 'complete':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case 'sim':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22a10 10 0 1 0-10-10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="overview">
      {/* KPI strip */}
      <div className="kpi-strip">
        {overviewKpis.map((kpi, idx) => (
          <div className="kpi" key={idx}>
            <div className="kpi-head">
              <div className="kpi-label">{kpi.label}</div>
              <div className={`kpi-icon ${kpi.iconClass}`}>
                {renderKpiIcon(kpi.iconType)}
              </div>
            </div>
            {kpi.iconType === 'distribution' ? (
              <div className="kpi-value">
                58<span className="unit" style={{ color: 'var(--neon-green)' }}> / </span>42<span className="unit">%</span>
              </div>
            ) : (
              <div className="kpi-value">
                {kpi.value}
                <span className="unit">{kpi.unit}</span>
              </div>
            )}
            <div className={`kpi-delta ${kpi.deltaType}`}>
              {renderDeltaIcon(kpi.deltaType)}
              {kpi.delta}
            </div>
          </div>
        ))}
      </div>

      {/* 7030 split: Date-wise demand stack chart + Risk + Suggested actions */}
      <div className="split-7030">
        {/* LEFT: Demand vs Capacity stack chart */}
        <div className="card">
          <div className="section-head">
            <div>
              <div className="section-title">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="M7 16V8M11 16v-6M15 16v-3M19 16V6" />
                </svg>
                Demand vs Capacity · 30-day Outlook
              </div>
              <div className="section-sub" style={{ marginTop: '6px' }}>
                Stacked trainer demand against rolling roster cap of <strong style={{ color: 'var(--text-primary)' }}>42 / day</strong>
              </div>
            </div>
            <div className="section-actions">
              <div className="legend-row" style={{ margin: 0 }}>
                <span className="leg">
                  <span className="sw" style={{ background: 'linear-gradient(180deg,#22D3A5,#14B886)' }}></span>
                  Internal
                </span>
                <span className="leg">
                  <span className="sw" style={{ background: 'linear-gradient(180deg,#A855F7,#7C3AED)' }}></span>
                  Freelancer
                </span>
                <span className="leg">
                  <span className="sw" style={{ background: 'linear-gradient(180deg,#06B6D4,#0891B2)' }}></span>
                  TA
                </span>
              </div>
            </div>
          </div>

          <div className="stack-chart" id="stackChart">
            {/* Bars filled by JS */}
          </div>
        </div>

        {/* RIGHT: Suggested actions */}
        <div>
          <div className="card">
            <div className="section-head">
              <div className="section-title">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Top Suggested Actions
              </div>
            </div>
            <div className="side-list">
              {suggestedActions.map((action, idx) => (
                <div className="side-row" key={idx}>
                  <div className="l">
                    <div className={`swatch ${action.swatchColor}`}>
                      {renderSuggestedActionIcon(action.iconType)}
                    </div>
                    <div>
                      <div className="name">{action.title}</div>
                      <div className="meta">{action.meta}</div>
                    </div>
                  </div>
                  <div className="v">
                    {action.value}
                    <span className="sub">{action.valueSub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 60/40 split: Active requirements table + Skills coverage */}
      <div className="split-6040">
        <div className="card">
          <div className="section-head">
            <div>
              <div className="section-title">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Active Pipeline
              </div>
              <div className="section-sub" style={{ marginTop: '6px' }}>
                Ranked by risk + days-to-start
              </div>
            </div>
            <div className="section-actions">
              <div className="chip accent">
                <span className="chip-dot"></span>32 Live
              </div>
              <div className="chip warning">
                <span className="chip-dot"></span>19 High Risk
              </div>
            </div>
          </div>

          <div className="pipeline-list" id="pipelineList">
            {/* Populated by JS */}
          </div>
          <div className="pipeline-footer">
            <span className="info">
              Showing <b id="pipeShown">5</b> of <b>32</b>
            </span>
            <button className="show-all-btn" id="pipeToggle">
              Show All
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>

        {/* Skills coverage right column */}
        <div>
          <div className="card">
            <div className="section-head">
              <div className="section-title">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                Track Coverage Heatmap
              </div>
            </div>
            <div className="side-list">
              {trackCoverages.map((cov, idx) => (
                <div className="side-row" key={idx}>
                  <div className="l">
                    <div style={{ font: '800 11px/1 var(--font)', color: 'var(--text-primary)' }}>
                      {cov.name}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '60%' }}>
                    <div className={`alloc-bar ${cov.status}`}>
                      <div style={{ width: `${cov.percent}%` }}></div>
                    </div>
                    <div className="alloc-num">
                      {cov.filled}
                      <span style={{ fontWeight: 500, fontSize: '9px', color: 'var(--text-muted)' }}>
                        {' '}
                        / {cov.total}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
