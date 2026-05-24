import { requirementsData } from '../data/requirements.js';

export default function Requirements({ active }) {
  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="requirements">
      <div className="callout" style={{ marginBottom: '16px' }}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <div className="callout-title">Live Excel sync</div>
        <div className="callout-body">
          All entries from <strong style={{ color: 'var(--text-primary)' }}>Request ID Track</strong> sheet auto-flow here. You can either edit the Excel or use the form below — both stay in lock-step.
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <div className="section-title">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              All Requirements
            </div>
            <div className="section-sub" style={{ marginTop: '6px' }}>32 active · 154 archived</div>
          </div>
          <div className="section-actions">
            <div className="input-wrap" style={{ width: '240px' }}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input className="input" placeholder="Search Delivery ID, client, programme..." />
            </div>
            <div className="range-segment">
              <button className="active">All</button>
              <button>Open</button>
              <button>Closed</button>
              <button>Cancelled</button>
            </div>
            <div className="cal-view-toggle" id="reqViewToggle">
              <button className="active" data-rview="table">Table</button>
              <button data-rview="gantt">Gantt</button>
            </div>
          </div>
        </div>

        <div id="reqGanttWrap" style={{ display: 'none' }}>
          <div className="gantt" id="ganttChart"></div>
        </div>

        <div id="reqTableWrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Delivery ID</th>
                <th>Course / Client</th>
                <th>Window</th>
                <th>Type</th>
                <th>Trainers</th>
                <th>TAs</th>
                <th>Gap</th>
                <th>Risk</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requirementsData.map((row) => (
                <tr key={row.id} className={`row-risk ${row.rowRiskClass}`}>
                  <td className="id">{row.id}</td>
                  <td>
                    <div className="lead-line">
                      <strong>{row.title}</strong>
                      <span className="sub">{row.sub}</span>
                    </div>
                  </td>
                  <td className="mono">{row.window}</td>
                  <td>
                    <span className={`chip ${row.typeClass}`}>{row.type}</span>
                  </td>
                  <td className="num">{row.trainers}</td>
                  <td className="num" style={{ color: row.tas === '—' ? 'var(--text-muted)' : undefined }}>
                    {row.tas}
                  </td>
                  <td className="num" style={{ color: row.gapColor }}>
                    {row.gap}
                  </td>
                  <td>
                    <span className={`chip ${row.riskClass}`}>
                      <span className="chip-dot"></span>
                      {row.risk}
                    </span>
                  </td>
                  <td>
                    <span className={`chip ${row.statusClass}`}>
                      <span className="chip-dot"></span>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
