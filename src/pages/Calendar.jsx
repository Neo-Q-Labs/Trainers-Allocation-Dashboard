import { calendarMetrics, calendarTracks, calendarClients } from '../data/calendar.js';

export default function Calendar({ active }) {
  const renderMetricIcon = (type) => {
    switch (type) {
      case 'clock':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l3 2" />
          </svg>
        );
      case 'trainers':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="7" r="4" />
            <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          </svg>
        );
      case 'peak':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        );
      case 'free':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case 'pool':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        );
      case 'ceiling':
        return (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="m7 14 4-4 4 4 5-5" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="calendar">
      <div className="card" style={{ marginBottom: '18px' }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              Programmes on the Calendar
            </div>
            <div className="section-sub" style={{ marginTop: '6px' }}>
              Each chip is a live programme — click any day to inspect the week. Switch views via the toggle.
            </div>
          </div>
          <div className="section-actions">
            <button className="btn-ghost">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Snapshot
            </button>
          </div>
        </div>

        {/* Clear-labelled metric strip */}
        <div className="cal-metric-strip">
          {calendarMetrics.map((met, idx) => (
            <div className="cal-metric" key={idx}>
              <div className="cm-icon" style={{ background: met.bg, color: met.color }}>
                {renderMetricIcon(met.iconType)}
              </div>
              <div className="cm-body">
                <div className="cm-num" style={{ color: met.color }}>{met.num}</div>
                <div className="cm-lab">{met.lab}</div>
                <div className="cm-sub">{met.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Track + Client filter */}
        <div className="cal-filters">
          <div className="cf-group">
            <span className="cf-label">Track</span>
            <div className="cf-chips" data-filter-type="track">
              {calendarTracks.map((tr) => (
                <span key={tr.val} className={`cf-chip ${tr.class || ''}`} data-val={tr.val}>
                  {tr.label}
                </span>
              ))}
            </div>
          </div>
          <div className="cf-group">
            <span className="cf-label">Client</span>
            <div className="cf-chips" data-filter-type="client">
              {calendarClients.map((cl) => (
                <span key={cl.val} className={`cf-chip ${cl.class || ''}`} data-val={cl.val}>
                  {cl.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar view */}
        <div style={{ marginTop: '14px' }}>
          <div className="cal-toolbar">
            <div className="cal-month-nav">
              <button className="cal-nav-btn" id="calPrev" aria-label="Previous">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="cal-month-label" id="calMonthLabel">May 2026</div>
              <button className="cal-nav-btn" id="calNext" aria-label="Next">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button className="cal-today-btn" id="calToday">Today</button>
            </div>
            <div className="cal-view-toggle">
              <button className="active" data-view="month">Month</button>
              <button data-view="quarter">Quarter</button>
              <button data-view="year">Year</button>
              <button data-view="gantt">Gantt</button>
            </div>
          </div>

          <div id="calWrap" className="cal-wrap"></div>

          <div className="cal-legend">
            <div className="cal-leg-item">
              <span className="sw idle"></span>0–10 demand
            </div>
            <div className="cal-leg-item">
              <span className="sw light"></span>10–20
            </div>
            <div className="cal-leg-item">
              <span className="sw mid"></span>20–35
            </div>
            <div className="cal-leg-item">
              <span className="sw warn"></span>35–42 (near capacity)
            </div>
            <div className="cal-leg-item">
              <span className="sw over"></span>Over capacity
            </div>
            <div className="cal-leg-item" style={{ marginLeft: 'auto' }}>
              <span className="sw today-leg"></span>Today
            </div>
            <div className="cal-leg-item">
              <span className="sw weekend-leg"></span>Weekend
            </div>
          </div>
        </div>
      </div>

      {/* Week-of-selected-day panel */}
      <div className="card">
        <div className="section-head">
          <div>
            <div className="section-title">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              Week of <span id="weekLabel" style={{ color: 'var(--accent-text)', marginLeft: '6px' }}>22–28 May 2026</span>
            </div>
            <div className="section-sub" style={{ marginTop: '6px' }}>
              Click any day on the calendar above to refocus the week here
            </div>
          </div>
          <div className="section-actions">
            <button className="cal-nav-btn" id="weekPrev" aria-label="Previous week">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button className="cal-nav-btn" id="weekNext" aria-label="Next week">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Weekly per-day bars */}
        <div className="week-grid" id="weekGrid">
          {/* generated by JS */}
        </div>

        {/* Programme summary for the week */}
        <div style={{ marginTop: '18px' }}>
          <div className="kpi-label" style={{ marginBottom: '10px' }}>PROGRAMMES RUNNING THIS WEEK</div>
          <div className="week-progs" id="weekProgs">
            {/* generated by JS */}
          </div>
        </div>
      </div>
    </section>
  );
}
