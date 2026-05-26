import { useMemo } from 'react';
import { useGetClientsQuery } from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';

/** Map backend kpis → clientKpis strip shape */
function mapKpis(k) {
  return [
    { label: 'Active Clients', value: String(k.active_clients ?? 0), sub: 'University · Corporate · Internal', style: {} },
    {
      label: 'Trainer-Days Committed',
      value: (k.trainer_days_committed ?? 0).toLocaleString(),
      sub: 'Across active pipeline',
      style: {},
    },
    {
      label: 'Top Client by Demand',
      value: k.top_client || 'N/A',
      sub: 'Highest trainer demand',
      style: { fontSize: '18px' },
    },
    { label: 'Avg Occupancy', value: `${k.avg_occupancy_pct ?? 0}%`, sub: 'Across all engagements', style: {} },
    {
      label: 'At-Risk Engagements',
      value: String(k.at_risk_count ?? 0),
      sub: 'Need immediate attention',
      style: { color: 'var(--neon-red)' },
    },
  ];
}

/** Map backend client → clientPortfolios card shape */
function mapPortfolio(c) {
  return {
    rank: c.rank,
    rankClass: c.rank_class || '',
    logoText: c.logo_initials || c.name?.substring(0, 2).toUpperCase() || '??',
    logoClass: c.logo_class || 'i',
    name: c.name,
    sub: c.sub || '',
    metrics: [
      { lab: 'Trainer-Days', val: String(c.trainer_days ?? 0), sub: '', valStyle: { color: 'var(--neon-yellow)' } },
      { lab: 'Active Programmes', val: String(c.active_programmes ?? 0), sub: '' },
      { lab: 'Occupancy', val: `${c.occupancy_pct ?? 0}%`, sub: '' },
      { lab: 'Working Days', val: String(c.working_days ?? 0), sub: '' },
    ],
    programmes: [
      ...(c.programmes || []).map((p) => ({ name: p })),
      ...(c.extra_programmes > 0 ? [{ name: `+${c.extra_programmes}`, isMore: true }] : []),
    ],
    status: c.status || 'Active',
    statusClass: c.risk === 'warn' ? 'warn' : 'ok',
  };
}

export default function Clients({ active }) {
  const { data, error, refetch } = useGetClientsQuery();
  const kpis = useMemo(() => (data?.kpis ? mapKpis(data.kpis) : null), [data]);
  const portfolios = useMemo(() => (data?.clients ?? []).map(mapPortfolio), [data]);

  if (error) return <ErrorPanel panelId="clients" active={active} error={error?.error || error?.message || 'Unknown error'} onRetry={() => refetch()} />;
  if (!data || !kpis) return <LoadingPanel panelId="clients" active={active} />;

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="clients">
      {/* KPI strip */}
      <div className="kpi-strip">
        {kpis.map((kpi, idx) => (
          <div className="kpi" key={idx}>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value" style={kpi.style}>{kpi.value}</div>
            <div className="kpi-sub">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Client cards · ranked */}
      <div className="card" style={{ marginTop: '18px' }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Clients · Ranked by Trainer Demand
            </div>
            <div className="section-sub" style={{ marginTop: '6px' }}>
              Each client = one engagement portfolio · drill down for programme list
            </div>
          </div>
          <div className="section-actions">
            <div className="range-segment">
              <button className="active">By Demand</button>
              <button>By Occupancy</button>
              <button>By Weightage</button>
            </div>
          </div>
        </div>

        <div className="client-grid">
          {portfolios.map((portfolio, idx) => (
            <div className={`client-card ${portfolio.rankClass || ''}`} key={idx}>
              <div className="cl-rank">#{portfolio.rank}</div>
              <div className="cl-head">
                <div className={`cl-logo ${portfolio.logoClass}`}>{portfolio.logoText}</div>
                <div>
                  <div className="cl-name">{portfolio.name}</div>
                  <div className="cl-sub">{portfolio.sub}</div>
                </div>
              </div>
              <div className="cl-metrics">
                {portfolio.metrics.map((met, metIdx) => (
                  <div className="cl-metric" key={metIdx}>
                    <div className="m-lab">{met.lab}</div>
                    <div className="m-val" style={met.valStyle}>{met.val}</div>
                    <div className="m-sub">{met.sub}</div>
                  </div>
                ))}
              </div>
              <div className="cl-progs">
                {portfolio.programmes.map((prog, progIdx) => (
                  <span key={progIdx} className={`cl-prog ${prog.isMore ? 'more' : ''}`}>
                    {prog.name}
                  </span>
                ))}
              </div>
              <div className="cl-foot">
                <span className={`cl-tag ${portfolio.statusClass}`}>
                  <span className="dot"></span>
                  {portfolio.status}
                </span>
                <button className="btn-ghost cl-btn">View Account</button>
              </div>
            </div>
          ))}
          {portfolios.length === 0 && (
            <div style={{ color: 'var(--text-muted)', padding: '32px', textAlign: 'center' }}>
              No client data available.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
