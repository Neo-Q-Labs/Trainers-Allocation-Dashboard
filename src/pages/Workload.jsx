import { Fragment } from 'react';
import { workloadKpis, overLoadedLanes, underUtilisedLanes, skillWeekData, capacityForecast } from '../data/workload.js';


export default function Workload({ active }) {
  const renderKpiIcon = (type) => {
    switch (type) {
      case 'chart':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="m7 14 4-4 4 4 5-5" />
          </svg>
        );
      case 'warning':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      case 'clock':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case 'ratio':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z" />
          </svg>
        );
      case 'forecast':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="workload">
      {/* KPI strip */}
      <div className="kpi-strip">
        {workloadKpis.map((kpi, idx) => (
          <div className="kpi" key={idx}>
            <div className="kpi-icon" style={{ background: kpi.iconBg, color: kpi.iconColor }}>
              {renderKpiIcon(kpi.iconType)}
            </div>
            <div className="kpi-body">
              <div className="kpi-label">{kpi.label}</div>
              {kpi.iconType === 'ratio' ? (
                <div className="kpi-value">
                  {kpi.value}
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 700 }}>
                    {kpi.extraVal}
                  </span>
                </div>
              ) : (
                <div className={`kpi-value ${kpi.iconColor ? 'crit' : kpi.iconType === 'clock' ? 'ok' : kpi.iconType === 'forecast' ? 'warn' : ''}`}>
                  {kpi.value}
                  {kpi.unit && <span className="unit">{kpi.unit}</span>}
                </div>
              )}
              <div className="kpi-trend">{kpi.trend}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="workload-grid">
        {/* LEFT: Histogram */}
        <div className="card">
          <div className="card-h">
            <div className="card-title">Workload Distribution · 254 Trainers</div>
            <div className="card-sub">Histogram of allocation % across the active trainer pool</div>
          </div>
          <div className="histogram" id="loadHist"></div>
          <div className="hist-legend">
            <span>
              <i className="low"></i>Idle 0–20
            </span>
            <span>
              <i className="low"></i>Low 20–40
            </span>
            <span>
              <i className="mid"></i>Healthy 40–60
            </span>
            <span>
              <i className="mid"></i>Optimal 60–85
            </span>
            <span>
              <i className="warn"></i>High 85–95
            </span>
            <span>
              <i className="crit"></i>Critical 95+
            </span>
          </div>
        </div>

        {/* RIGHT: Lanes */}
        <div className="card">
          <div className="card-h">
            <div className="card-title">Top Loaded · Under-Utilised</div>
            <div className="card-sub">Outliers needing rebalancing</div>
          </div>
          <div style={{ font: '800 9px/1 var(--font)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--neon-red)', margin: '14px 0 8px' }}>
            ⬆ Over-Loaded · 5 of 11
          </div>
          <div className="lanes-row">
            {overLoadedLanes.map((lane, idx) => (
              <div className="lane" key={idx}>
                <div className="lane-name">
                  {lane.name}
                  <small>{lane.sub}</small>
                </div>
                <div className={`lane-bar ${lane.barClass}`}>
                  <i style={{ width: `${lane.val}%` }}></i>
                </div>
                <div className={`lane-val ${lane.barClass}`}>{lane.val}%</div>
              </div>
            ))}
          </div>
          <div style={{ font: '800 9px/1 var(--font)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--neon-green)', margin: '18px 0 8px' }}>
            ⬇ Under-Utilised · 5 of 17
          </div>
          <div className="lanes-row">
            {underUtilisedLanes.map((lane, idx) => (
              <div className="lane" key={idx}>
                <div className="lane-name">
                  {lane.name}
                  <small>{lane.sub}</small>
                </div>
                <div className={`lane-bar ${lane.barClass}`}>
                  <i style={{ width: `${lane.val}%` }}></i>
                </div>
                <div className={`lane-val ${lane.barClass}`}>{lane.val}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Skill x Week heatmap */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card-h" style={{ display: 'flex', alignItems: 'center', justifySpace: 'space-between', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">Skill-Area Load · 8-Week Window</div>
            <div className="card-sub">Internal pool only · % allocation</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ font: '700 9px/1 var(--mono)', color: 'var(--text-muted)' }}>LOW</span>
            <div style={{ display: 'flex', gap: '2px' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(34,211,165,0.16)' }}></div>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(3,37,189,0.22)' }}></div>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(3,37,189,0.45)' }}></div>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(245,197,66,0.45)' }}></div>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(239,68,68,0.55)' }}></div>
            </div>
            <span style={{ font: '700 9px/1 var(--mono)', color: 'var(--text-muted)' }}>HIGH</span>
          </div>
        </div>
        <div className="skillweek">
          <div></div>
          <div className="sw-header">
            W22<br />
            <span style={{ opacity: 0.6 }}>25 May</span>
          </div>
          <div className="sw-header">
            W23<br />
            <span style={{ opacity: 0.6 }}>01 Jun</span>
          </div>
          <div className="sw-header">
            W24<br />
            <span style={{ opacity: 0.6 }}>08 Jun</span>
          </div>
          <div className="sw-header">
            W25<br />
            <span style={{ opacity: 0.6 }}>15 Jun</span>
          </div>
          <div className="sw-header">
            W26<br />
            <span style={{ opacity: 0.6 }}>22 Jun</span>
          </div>
          <div className="sw-header">
            W27<br />
            <span style={{ opacity: 0.6 }}>29 Jun</span>
          </div>
          <div className="sw-header">
            W28<br />
            <span style={{ opacity: 0.6 }}>06 Jul</span>
          </div>
          <div className="sw-header">
            W29<br />
            <span style={{ opacity: 0.6 }}>13 Jul</span>
          </div>

          {skillWeekData.map((row, rowIdx) => (
            <Fragment key={rowIdx}>
              <div className="sw-row-label">{row.skill}</div>
              {row.cells.map((c, cellIdx) => (
                <div key={cellIdx} className={`sw-cell ${c.lvl}`}>
                  {c.val}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Forecast row */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card-h" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">FY27 Capacity Forecast · Quarterly</div>
            <div className="card-sub">Demand vs internal pool · model-projected (81% accuracy)</div>
          </div>
          <span style={{ font: '700 10px/1 var(--mono)', color: 'var(--text-muted)' }}>
            As of 22 May 2026 · 14:18 IST
          </span>
        </div>
        <div className="forecast-row">
          {capacityForecast.map((fc, idx) => (
            <div className={`fc-card ${fc.nowClass || ''}`} key={idx}>
              <div className="fc-q">{fc.quarter}</div>
              <div className={`fc-v ${fc.valClass || ''}`}>{fc.val}</div>
              <div className="fc-d">{fc.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
