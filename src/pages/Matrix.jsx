import { matrixTracks, matrixClients, heatmapLegends } from '../data/matrix.js';

export default function Matrix({ active }) {
  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="matrix">
      <div className="card">
        <div className="section-head">
          <div>
            <div className="section-title">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="7" r="4" />
                <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
              </svg>
              Trainer Matrix · Engagement Grid
            </div>
            <div className="section-sub" style={{ marginTop: '6px' }}>
              Live allocation per trainer × day · brighter = more deliveries · hover any cell
            </div>
          </div>
          <div className="section-actions">
            <div className="input-wrap" style={{ width: '240px' }}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input className="input" placeholder="Search trainer or track..." />
            </div>
            <div className="range-segment">
              <button>All</button>
              <button className="active">Free</button>
              <button>Occupied</button>
              <button>Conflict</button>
            </div>
          </div>
        </div>

        {/* Track + Client filter for the Matrix */}
        <div className="cal-filters" id="matrixFilters">
          <div className="cf-group">
            <span className="cf-label">Track</span>
            <div className="cf-chips" data-filter-type="m-track">
              {matrixTracks.map((tr) => (
                <span key={tr.val} className={`cf-chip ${tr.class || ''}`} data-val={tr.val}>
                  {tr.label}
                </span>
              ))}
            </div>
          </div>
          <div className="cf-group">
            <span className="cf-label">Client</span>
            <div className="cf-chips" data-filter-type="m-client">
              {matrixClients.map((cl) => (
                <span key={cl.val} className={`cf-chip ${cl.class || ''}`} data-val={cl.val}>
                  {cl.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="heatmap-wrap" style={{ marginTop: '14px' }}>
          <div className="heatmap" id="heatmap">
            {/* generated */}
          </div>
        </div>

        <div className="hm-legend">
          {heatmapLegends.map((item, idx) => (
            <span className="hm-legend-item" key={idx}>
              <span className="hm-legend-swatch" style={{ background: item.bg }}></span>
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Directory grid */}
      <div className="card" style={{ marginTop: '18px' }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Trainer Directory · Snapshot
            </div>
            <div className="section-sub" style={{ marginTop: '6px' }}>
              254 trainers monitored · 86 internal · 168 freelancer pool
            </div>
          </div>
        </div>
        <div className="dir-grid" id="trainerDir">
          {/* generated */}
        </div>
      </div>
    </section>
  );
}
