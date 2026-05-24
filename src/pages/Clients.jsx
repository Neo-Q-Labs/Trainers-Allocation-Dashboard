import { clientKpis, clientPortfolios } from '../data/clients.js';

export default function Clients({ active }) {
  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="clients">
      {/* KPI strip */}
      <div className="kpi-strip">
        {clientKpis.map((kpi, idx) => (
          <div className="kpi" key={idx}>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value" style={kpi.style}>
              {kpi.value}
            </div>
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
          {clientPortfolios.map((portfolio, idx) => (
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
                    <div className="m-val" style={met.valStyle}>
                      {met.val}
                    </div>
                    <div className="m-sub">{met.sub}</div>
                  </div>
                ))}
              </div>
              <div className="cl-progs">
                {portfolio.programmes.map((prog, progIdx) => (
                  <span
                    key={progIdx}
                    className={`cl-prog ${prog.isMore ? 'more' : ''}`}
                  >
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
        </div>
      </div>
    </section>
  );
}
