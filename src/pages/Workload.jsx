import { Fragment, useMemo } from 'react';
import { useGetWorkloadQuery } from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';

/**
 * skillWeekData and capacityForecast are kept static:
 * - skillWeekData requires an AI skill-mapping layer not present in the Excel.
 * - capacityForecast requires quarterly modelling outside the scope of live data.
 * These can be replaced once those layers are available.
 */
const skillWeekData = [
  { skill: 'Java / Spring', cells: [{ val: 68, lvl: 'h3' }, { val: 72, lvl: 'h3' }, { val: 81, lvl: 'h4' }, { val: 75, lvl: 'h3' }, { val: 62, lvl: 'h3' }, { val: 58, lvl: 'h2' }, { val: 44, lvl: 'h2' }, { val: 51, lvl: 'h2' }] },
  { skill: 'Python / ML', cells: [{ val: 45, lvl: 'h2' }, { val: 52, lvl: 'h2' }, { val: 61, lvl: 'h3' }, { val: 88, lvl: 'h5' }, { val: 91, lvl: 'h5' }, { val: 77, lvl: 'h4' }, { val: 65, lvl: 'h3' }, { val: 58, lvl: 'h2' }] },
  { skill: 'Cloud / AWS', cells: [{ val: 33, lvl: 'h1' }, { val: 41, lvl: 'h2' }, { val: 55, lvl: 'h2' }, { val: 63, lvl: 'h3' }, { val: 70, lvl: 'h3' }, { val: 82, lvl: 'h4' }, { val: 78, lvl: 'h4' }, { val: 71, lvl: 'h3' }] },
  { skill: 'React / Node', cells: [{ val: 82, lvl: 'h4' }, { val: 79, lvl: 'h4' }, { val: 73, lvl: 'h3' }, { val: 68, lvl: 'h3' }, { val: 55, lvl: 'h2' }, { val: 49, lvl: 'h2' }, { val: 61, lvl: 'h3' }, { val: 74, lvl: 'h3' }] },
  { skill: 'Testing / QA', cells: [{ val: 51, lvl: 'h2' }, { val: 58, lvl: 'h2' }, { val: 64, lvl: 'h3' }, { val: 71, lvl: 'h3' }, { val: 85, lvl: 'h4' }, { val: 93, lvl: 'h5' }, { val: 88, lvl: 'h5' }, { val: 79, lvl: 'h4' }] },
  { skill: 'Soft Skills', cells: [{ val: 22, lvl: 'h1' }, { val: 31, lvl: 'h1' }, { val: 28, lvl: 'h1' }, { val: 35, lvl: 'h1' }, { val: 42, lvl: 'h2' }, { val: 38, lvl: 'h1' }, { val: 29, lvl: 'h1' }, { val: 33, lvl: 'h1' }] },
];

const capacityForecast = [
  { quarter: 'Q1 FY27', val: '94%', desc: 'Demand projected at 94% of pool capacity', valClass: 'warn', nowClass: '' },
  { quarter: 'Q2 FY27', val: '108%', desc: 'OVER CAPACITY — freelancer buffer needed', valClass: 'crit', nowClass: '' },
  { quarter: 'Q3 FY27', val: '87%', desc: 'Healthy — minor rebalancing recommended', valClass: '', nowClass: 'now' },
  { quarter: 'Q4 FY27', val: '71%', desc: 'Under-utilised — bench risk growing', valClass: 'ok', nowClass: '' },
];

/** Map backend kpis → workloadKpis strip shape */
function mapKpis(k) {
  return [
    {
      label: 'Team Avg Load', value: String(k.avg_load_pct ?? 0), unit: '%',
      trend: 'From live allocation data', iconType: 'chart', iconBg: '', iconColor: '',
    },
    {
      label: 'Over-Loaded (>85%)', value: String(k.overloaded_count ?? 0),
      trend: 'Need rebalancing', iconType: 'warning',
      iconBg: 'rgba(239,68,68,0.12)', iconColor: 'var(--neon-red)',
    },
    {
      label: 'Bench Utilisation', value: String(k.bench_utilization_pct ?? 0), unit: '%',
      trend: 'Trainers with low activity', iconType: 'clock',
      iconBg: 'rgba(34,211,165,0.12)', iconColor: 'var(--neon-green)',
    },
    {
      label: 'Internal : Freelancer',
      value: String(k.internal_pct ?? 58),
      extraVal: ` : ${k.freelancer_pct ?? 42}`,
      trend: 'Target mix 60:40', iconType: 'ratio', iconBg: '', iconColor: '',
    },
    {
      label: 'Forecast Accuracy', value: '81', unit: '%',
      trend: 'Last 4 wks predicted', iconType: 'forecast',
      iconBg: 'rgba(245,197,66,0.12)', iconColor: 'var(--neon-yellow)',
    },
  ];
}

/** Map backend trainer lane → overLoadedLanes / underUtilisedLanes shape */
function mapLane(t) {
  return {
    name: t.name,
    sub: t.sub || '',
    val: t.utilization,
    barClass: t.bar_class || (t.utilization > 90 ? 'crit' : t.utilization > 70 ? 'warn' : 'low'),
  };
}

export default function Workload({ active }) {
  const { data, error, refetch } = useGetWorkloadQuery();
  const kpis = useMemo(() => (data?.kpis ? mapKpis(data.kpis) : null), [data]);
  const overLoadedLanes = useMemo(() => (data?.top_loaded ?? []).map(mapLane), [data]);
  const underUtilisedLanes = useMemo(() => (data?.under_utilised ?? []).map(mapLane), [data]);
  const trainerCount = data?.distribution
    ? Object.values(data.distribution).reduce((a, b) => a + b, 0)
    : 0;

  if (error) return <ErrorPanel panelId="workload" active={active} error={error?.error || error?.message || 'Unknown error'} onRetry={() => refetch()} />;
  if (!data || !kpis) return <LoadingPanel panelId="workload" active={active} />;

  const renderKpiIcon = (type) => {
    switch (type) {
      case 'chart':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" /><path d="m7 14 4-4 4 4 5-5" />
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
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
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
        {kpis.map((kpi, idx) => (
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
            <div className="card-title">Workload Distribution · {trainerCount} Trainers</div>
            <div className="card-sub">Histogram of allocation % across the active trainer pool</div>
          </div>
          <div className="histogram" id="loadHist"></div>
          <div className="hist-legend">
            <span><i className="low"></i>Idle 0–20</span>
            <span><i className="low"></i>Low 20–40</span>
            <span><i className="mid"></i>Healthy 40–60</span>
            <span><i className="mid"></i>Optimal 60–85</span>
            <span><i className="warn"></i>High 85–95</span>
            <span><i className="crit"></i>Critical 95+</span>
          </div>
        </div>

        {/* RIGHT: Lanes */}
        <div className="card">
          <div className="card-h">
            <div className="card-title">Top Loaded · Under-Utilised</div>
            <div className="card-sub">Outliers needing rebalancing</div>
          </div>
          <div style={{ font: '800 9px/1 var(--font)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--neon-red)', margin: '14px 0 8px' }}>
            ⬆ Over-Loaded · {overLoadedLanes.length} trainers
          </div>
          <div className="lanes-row">
            {overLoadedLanes.map((lane, idx) => (
              <div className="lane" key={idx}>
                <div className="lane-name">{lane.name}<small>{lane.sub}</small></div>
                <div className={`lane-bar ${lane.barClass}`}><i style={{ width: `${lane.val}%` }}></i></div>
                <div className={`lane-val ${lane.barClass}`}>{lane.val}%</div>
              </div>
            ))}
            {overLoadedLanes.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No overloaded trainers.</div>
            )}
          </div>
          <div style={{ font: '800 9px/1 var(--font)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--neon-green)', margin: '18px 0 8px' }}>
            ⬇ Under-Utilised · {underUtilisedLanes.length} trainers
          </div>
          <div className="lanes-row">
            {underUtilisedLanes.map((lane, idx) => (
              <div className="lane" key={idx}>
                <div className="lane-name">{lane.name}<small>{lane.sub}</small></div>
                <div className={`lane-bar ${lane.barClass}`}><i style={{ width: `${lane.val}%` }}></i></div>
                <div className={`lane-val ${lane.barClass}`}>{lane.val}%</div>
              </div>
            ))}
            {underUtilisedLanes.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No under-utilised trainers.</div>
            )}
          </div>
        </div>
      </div>

      {/* Skill x Week heatmap — static (requires AI skill-mapping layer) */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card-h" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">Skill-Area Load · 8-Week Window</div>
            <div className="card-sub">Internal pool only · % allocation</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ font: '700 9px/1 var(--mono)', color: 'var(--text-muted)' }}>LOW</span>
            <div style={{ display: 'flex', gap: '2px' }}>
              {['rgba(34,211,165,0.16)', 'rgba(3,37,189,0.22)', 'rgba(3,37,189,0.45)', 'rgba(245,197,66,0.45)', 'rgba(239,68,68,0.55)'].map((bg, i) => (
                <div key={i} style={{ width: '14px', height: '14px', borderRadius: '3px', background: bg }}></div>
              ))}
            </div>
            <span style={{ font: '700 9px/1 var(--mono)', color: 'var(--text-muted)' }}>HIGH</span>
          </div>
        </div>
        <div className="skillweek">
          <div></div>
          {['W22\n25 May', 'W23\n01 Jun', 'W24\n08 Jun', 'W25\n15 Jun', 'W26\n22 Jun', 'W27\n29 Jun', 'W28\n06 Jul', 'W29\n13 Jul'].map((w, i) => {
            const [wk, dt] = w.split('\n');
            return (
              <div key={i} className="sw-header">
                {wk}<br />
                <span style={{ opacity: 0.6 }}>{dt}</span>
              </div>
            );
          })}
          {skillWeekData.map((row, rowIdx) => (
            <Fragment key={rowIdx}>
              <div className="sw-row-label">{row.skill}</div>
              {row.cells.map((c, cellIdx) => (
                <div key={cellIdx} className={`sw-cell ${c.lvl}`}>{c.val}</div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Forecast row — static projections */}
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
