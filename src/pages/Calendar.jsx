import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useGetCalendarDataQuery,
  useGetCalendarWeekQuery,
  useGetCalendarGanttQuery,
  useGetDeliveriesQuery,
} from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';

const calendarTracks = [
  { val: 'all', label: 'All Tracks' },
  { val: 'dsa', label: 'DSA' },
  { val: 'apt', label: 'Aptitude' },
  { val: 'java', label: 'Java FS' },
  { val: 'cloud', label: '.NET/Cloud' },
  { val: 'cyber', label: 'Cy.Sec' },
  { val: 'sap', label: 'SAP' },
  { val: 'python', label: 'Python/ML' }
];

const calendarClients = [
  { val: 'all', label: 'All Clients' },
  { val: 'parul', label: 'Parul Univ' },
  { val: 'skg', label: 'SKG' },
  { val: 'lti', label: 'LTIMindtree' },
  { val: 'kct', label: 'KCT' },
  { val: 'hexaware', label: 'Hexaware' },
  { val: 'iamneo', label: 'iamneo Internal' }
];

// Client → CSS class + display color mapping
const CLIENT_META = {
  parul:    { cls: 'client-parul',    color: '#818cf8', label: 'Parul Univ' },
  skg:      { cls: 'client-skg',      color: '#22d3a5', label: 'SKG' },
  lti:      { cls: 'client-lti',      color: '#06b6d4', label: 'LTIMindtree' },
  kct:      { cls: 'client-kct',      color: '#f5c542', label: 'KCT' },
  hexaware: { cls: 'client-hexaware', color: '#fb923c', label: 'Hexaware' },
  iamneo:   { cls: 'client-iamneo',   color: '#a855f7', label: 'iamneo' },
  other:    { cls: 'client-other',    color: '#94a3b8', label: 'Other' },
};

function clientClass(client) {
  return CLIENT_META[client]?.cls || 'client-other';
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_S = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const CAPACITY = 42;

/** Formatter helper for backend-compatible YYYY-MM-DD keys */
const key = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dateNum = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dateNum}`;
};

const isSameDate = (a, b) => {
  return a.getFullYear() === b.getFullYear() && 
         a.getMonth() === b.getMonth() && 
         a.getDate() === b.getDate();
};

const loadLevel = (demand) => {
  if (demand === 0) return 'l0';
  if (demand > CAPACITY) return 'l5';
  if (demand >= 35) return 'l4';
  if (demand >= 20) return 'l2';
  if (demand >= 10) return 'l1';
  return 'l0';
};

/** Clean and truncate long program names to be short and readable */
function cleanEventName(name) {
  if (!name) return '';
  let cleaned = name;
  
  // Remove common prefixes
  cleaned = cleaned.replace(/^(Exam Reporting|Summer Residential|Residential Phase\s*\d+|SKG Electives)\s*:\s*/i, '');

  // Split on pipe (|) or bullet (·)
  const mainSplitters = ['|', '·'];
  for (const splitter of mainSplitters) {
    if (cleaned.includes(splitter)) {
      cleaned = cleaned.split(splitter)[0].trim();
    }
  }

  // Also clean up any lingering prefix/suffix with colons
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':').map(p => p.trim());
    cleaned = parts[parts.length - 1];
  }

  cleaned = cleaned.trim();

  // Truncate if still too long
  if (cleaned.length > 20) {
    cleaned = cleaned.substring(0, 18) + '...';
  }
  
  return cleaned;
}

export default function Calendar({ active }) {
  // Filter States
  const [trackFilter, setTrackFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');

  // Programme-detail modal (opens when a "Programmes Running This Week" card is clicked)
  const [progDetailId, setProgDetailId] = useState(null);

  // View States
  const [view, setView] = useState('month'); // 'month', 'quarter', 'year', 'gantt'
  const [cursorDate, setCursorDate] = useState(() => new Date(2026, 4, 22)); // May 22, 2026 as target today
  const [selectedDate, setSelectedDate] = useState(() => new Date(2026, 4, 22));

  // Gantt specific filter states
  const [ganttSearch, setGanttSearch] = useState('');
  const [trainerToggle, setTrainerToggle] = useState('engaged'); // 'engaged', 'all'

  const cursorYear = cursorDate.getFullYear();
  const cursorMonth = cursorDate.getMonth();

  // ----- Redux-backed queries -----
  // Deliveries — used to enrich the programme-detail modal with status, dates,
  // trainer list, total/filled slots. Already in the global Redux cache.
  const { data: deliveriesData } = useGetDeliveriesQuery({});
  const deliveryByIdMap = useMemo(() => {
    const m = new Map();
    (deliveriesData?.deliveries || []).forEach((d) => {
      if (d.delivery_id) m.set(d.delivery_id, d);
    });
    return m;
  }, [deliveriesData]);

  // Calendar data (year-wide if quarter/year, month-bound otherwise).
  const calendarArgs = useMemo(() => {
    if (view === 'month') return { year: cursorYear, month: cursorMonth + 1 };
    if (view === 'quarter' || view === 'year') return { year: cursorYear, month: null };
    return null; // gantt view doesn't use this
  }, [view, cursorYear, cursorMonth]);
  const {
    data: calendarRes,
    isFetching: loadingCal,
    error: calErr,
  } = useGetCalendarDataQuery(calendarArgs ?? { year: cursorYear }, { skip: !calendarArgs });
  const calendarData = calendarRes?.calendar_data || (calendarArgs ? null : {});

  // Gantt data (only when gantt view is active).
  const ganttArg = useMemo(
    () => (view === 'gantt' ? { start_date: key(cursorDate), days: 28 } : null),
    [view, cursorDate],
  );
  const {
    data: ganttData,
    isFetching: loadingGantt,
    error: ganttErr,
  } = useGetCalendarGanttQuery(ganttArg ?? { start_date: key(cursorDate), days: 28 }, { skip: !ganttArg });

  // Week drill-down — driven by the selected day cell.
  const weekKey = useMemo(() => key(selectedDate), [selectedDate]);
  const {
    data: weekData,
    isFetching: loadingWeek,
  } = useGetCalendarWeekQuery(weekKey, { skip: !active });

  const loading = loadingCal || loadingGantt;
  const error = calErr || ganttErr;

  // Helper to dynamically filter events and demand for any day
  const getFilteredDayData = useCallback((events, demand) => {
    const evts = events || [];
    const filteredEvents = evts.filter((evt) => {
      if (trackFilter !== 'all' && evt.track !== trackFilter) return false;
      if (clientFilter !== 'all' && evt.client !== clientFilter) return false;
      return true;
    });

    const ratio = evts.length > 0 ? filteredEvents.length / evts.length : 0;
    const filteredDemand = Math.round((demand || 0) * ratio);

    return {
      demand: filteredDemand,
      events: filteredEvents
    };
  }, [trackFilter, clientFilter]);

  // Handle Day Clicks
  const handleDayClick = useCallback((cellDate) => {
    setSelectedDate(cellDate);
    // Smooth-scroll to week-of panel
    const weekEl = document.getElementById('weekGridSection');
    if (weekEl) {
      weekEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Main Toolbar Navigation Handlers
  const handlePrev = () => {
    const newDate = new Date(cursorDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'quarter') {
      newDate.setMonth(newDate.getMonth() - 3);
    } else if (view === 'year') {
      newDate.setFullYear(newDate.getFullYear() - 1);
    } else if (view === 'gantt') {
      newDate.setDate(newDate.getDate() - 28);
    }
    setCursorDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(cursorDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'quarter') {
      newDate.setMonth(newDate.getMonth() + 3);
    } else if (view === 'year') {
      newDate.setFullYear(newDate.getFullYear() + 1);
    } else if (view === 'gantt') {
      newDate.setDate(newDate.getDate() + 28);
    }
    setCursorDate(newDate);
  };

  const handleToday = () => {
    const todayVal = new Date(2026, 4, 22);
    setCursorDate(todayVal);
    setSelectedDate(todayVal);
  };

  // Week-of Panel Navigation Handlers
  const handleWeekPrev = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const handleWeekNext = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  // Get formatted Toolbar Title
  const getNavLabel = () => {
    if (view === 'year') {
      return cursorDate.getFullYear();
    } else if (view === 'quarter') {
      const q = Math.floor(cursorDate.getMonth() / 3) + 1;
      return `Q${q} ${cursorDate.getFullYear()}`;
    } else if (view === 'gantt') {
      const endD = new Date(cursorDate);
      endD.setDate(cursorDate.getDate() + 27);
      const fmt = (d) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
      return `${fmt(cursorDate)} – ${fmt(endD)} ${endD.getFullYear()}`;
    } else {
      return `${MONTHS[cursorDate.getMonth()]} ${cursorDate.getFullYear()}`;
    }
  };

  // Week Days calculation (Sun-Sat)
  const weekDays = useMemo(() => {
    const dow = selectedDate.getDay();
    const sunday = new Date(selectedDate);
    sunday.setDate(selectedDate.getDate() - dow);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [selectedDate]);

  const getWeekLabel = () => {
    if (weekDays.length < 7) return '';
    const start = weekDays[0];
    const end = weekDays[6];
    const lblStart = start.getDate();
    const lblEnd = end.getDate();
    const lblMo1 = MONTHS_SHORT[start.getMonth()];
    const lblMo2 = MONTHS_SHORT[end.getMonth()];
    const sameMo = start.getMonth() === end.getMonth();
    return sameMo
      ? `${lblStart}–${lblEnd} ${lblMo1} ${start.getFullYear()}`
      : `${lblStart} ${lblMo1} – ${lblEnd} ${lblMo2} ${start.getFullYear()}`;
  };

  // Filtered week programmes summary
  const filteredWeekProgs = useMemo(() => {
    return (weekData?.programmes || []).filter((prog) => {
      if (trackFilter !== 'all' && prog.track !== trackFilter) return false;
      if (clientFilter !== 'all' && prog.client !== clientFilter) return false;
      return true;
    });
  }, [weekData, trackFilter, clientFilter]);

  // Gantt Trainers Calculation
  const ganttDays = useMemo(() => {
    const daysArr = [];
    for (let i = 0; i < 28; i++) {
      const d = new Date(cursorDate);
      d.setDate(cursorDate.getDate() + i);
      daysArr.push(d);
    }
    return daysArr;
  }, [cursorDate]);

  const todayIndex = useMemo(() => {
    const todayVal = new Date(2026, 4, 22);
    return ganttDays.findIndex((d) => isSameDate(d, todayVal));
  }, [ganttDays]);

  const filteredTrainers = useMemo(() => {
    return (ganttData?.trainers || [])
      .filter((t) => {
        // Name & ID search
        const matchSearch = t.name.toLowerCase().includes(ganttSearch.toLowerCase()) ||
                            t.id.toLowerCase().includes(ganttSearch.toLowerCase());
        if (!matchSearch) return false;

        // Engaged / All Toggle
        if (trainerToggle === 'engaged' && (!t.bars || t.bars.length === 0)) {
          return false;
        }

        return true;
      });
  }, [ganttData, ganttSearch, trainerToggle]);

  // Generate 42 cells for the selected month grid
  const monthCells = useMemo(() => {
    const y = cursorDate.getFullYear();
    const m = cursorDate.getMonth();
    const firstDay = new Date(y, m, 1);
    const startOffset = firstDay.getDay();

    const cells = [];
    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(y, m, i - startOffset + 1);
      cells.push(cellDate);
    }
    return cells;
  }, [cursorDate]);

  // Dynamic Mini-Month Grid Generator for Quarter/Year views
  const renderMiniMonth = (monthDate) => {
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const firstDay = new Date(y, m, 1);
    const startOffset = firstDay.getDay();

    const cells = [];
    for (let i = 0; i < 42; i++) {
      cells.push(new Date(y, m, i - startOffset + 1));
    }

    return (
      <div className="cal-mini" key={`${y}-${m}`}>
        <div className="cal-mini-title">{MONTHS_SHORT[m]} {y}</div>
        <div className="cal-mini-grid">
          {DOW_S.map((d, idx) => (
            <div className="cal-mini-dow" key={idx}>{d}</div>
          ))}
          {cells.map((cellDate, idx) => {
            const cellDateStr = key(cellDate);
            const inMonth = cellDate.getMonth() === m;
            const isToday = isSameDate(cellDate, new Date(2026, 4, 22));

            const rawDay = calendarData?.[cellDateStr] || { demand: 0, events: [] };
            const filtered = getFilteredDayData(rawDay.events, rawDay.demand);
            const lvl = loadLevel(filtered.demand);

            return (
              <div
                key={idx}
                className={`cal-mini-day ${lvl}${!inMonth ? ' out' : ''}${isToday ? ' today' : ''}`}
                onClick={() => handleDayClick(cellDate)}
                title={`${cellDate.toDateString()} · ${filtered.demand} demand`}
              >
                {cellDate.getDate()}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderQuarterView = () => {
    const y = cursorDate.getFullYear();
    const qStart = Math.floor(cursorDate.getMonth() / 3) * 3;
    const monthsArr = [];
    for (let i = 0; i < 3; i++) {
      monthsArr.push(new Date(y, qStart + i, 1));
    }
    return (
      <div className="cal-quarter">
        {monthsArr.map(renderMiniMonth)}
      </div>
    );
  };

  const renderYearView = () => {
    const y = cursorDate.getFullYear();
    const monthsArr = [];
    for (let i = 0; i < 12; i++) {
      monthsArr.push(new Date(y, i, 1));
    }
    return (
      <div className="cal-year">
        {monthsArr.map(renderMiniMonth)}
      </div>
    );
  };

  if (error) return <ErrorPanel panelId="calendar" active={active} error={error} onRetry={() => window.location.reload()} />;
  if (loading && !calendarRes) return <LoadingPanel panelId="calendar" active={active} />;

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="calendar">
      <style>{`
        /* Compact calendar day cells */
        .cal-day {
          min-height: 76px !important;
          padding: 5px 6px !important;
          gap: 2px !important;
        }
        .cal-day-num {
          font-size: 13px !important;
        }
        .cal-day-head {
          margin-bottom: 2px !important;
        }
        .cal-day-tag {
          font-size: 7px !important;
          padding: 1.5px 3px !important;
        }
        .cal-events {
          gap: 2px !important;
        }
        .cal-event {
          font-size: 9.5px !important;
          padding: 2.5px 5px !important;
          margin-bottom: 1px !important;
          line-height: 1.1 !important;
        }
        .cal-event-more {
          font-size: 9px !important;
          padding: 1px 0 !important;
        }
        .cal-day-bottom {
          margin-top: auto !important;
        }
        .cal-day-load {
          font-size: 9px !important;
        }
      `}</style>
      <div className="card" style={{ marginBottom: '18px' }}>
        {/* Track + Client filter chips */}
        <div className="cal-filters">
          <div className="cf-group">
            <span className="cf-label">Track</span>
            <div className="cf-chips">
              {calendarTracks.map((tr) => (
                <span
                  key={tr.val}
                  className={`cf-chip ${tr.val} ${trackFilter === tr.val ? 'active' : ''}`}
                  onClick={() => setTrackFilter(tr.val)}
                >
                  {tr.label}
                </span>
              ))}
            </div>
          </div>
          <div className="cf-group">
            <span className="cf-label">Client</span>
            <div className="cf-chips">
              {calendarClients.map((cl) => (
                <span
                  key={cl.val}
                  className={`cf-chip ${cl.val} ${clientFilter === cl.val ? 'active' : ''}`}
                  onClick={() => setClientFilter(cl.val)}
                >
                  {cl.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar View Toggle & Nav Toolbar */}
        <div style={{ marginTop: '14px' }}>
          <div className="cal-toolbar">
            <div className="cal-month-nav">
              <button className="cal-nav-btn" onClick={handlePrev} aria-label="Previous">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="cal-month-label">{getNavLabel()}</div>
              <button className="cal-nav-btn" onClick={handleNext} aria-label="Next">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button className="cal-today-btn" onClick={handleToday}>Today</button>
            </div>
            <div className="cal-view-toggle">
              <button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>Month</button>
              <button className={view === 'quarter' ? 'active' : ''} onClick={() => setView('quarter')}>Quarter</button>
              <button className={view === 'year' ? 'active' : ''} onClick={() => setView('year')}>Year</button>
              <button className={view === 'gantt' ? 'active' : ''} onClick={() => setView('gantt')}>Gantt</button>
            </div>
          </div>

          <div className="cal-wrap">
            {loading ? (
              <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center', width: '100%' }}>
                <span style={{ font: '600 13px var(--font)', color: 'var(--text-muted)' }}>Refreshing Calendar...</span>
              </div>
            ) : view === 'month' ? (
              <div className="cal-month">
                {DOW.map((d, idx) => (
                  <div key={idx} className={`cal-dow${idx === 0 || idx === 6 ? ' we' : ''}`}>{d}</div>
                ))}
                {monthCells.map((cellDate, idx) => {
                  const cellDateStr = key(cellDate);
                  const isToday = isSameDate(cellDate, new Date(2026, 4, 22));
                  const inMonth = cellDate.getMonth() === cursorDate.getMonth();
                  const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;

                  const rawDay = calendarData?.[cellDateStr] || { demand: 0, events: [] };
                  const filtered = getFilteredDayData(rawDay.events, rawDay.demand);

                  let stateCls = '';
                  if (!inMonth) stateCls += ' out';
                  if (isWeekend) stateCls += ' weekend';
                  if (isToday) stateCls += ' today';
                  if (filtered.demand > CAPACITY) stateCls += ' over';
                  else if (filtered.demand >= 35) stateCls += ' warn';

                  return (
                    <div
                      key={idx}
                      className={`cal-day${stateCls}`}
                      onClick={() => handleDayClick(cellDate)}
                    >
                      <div className="cal-day-head">
                        <div className="cal-day-num">{cellDate.getDate()}</div>
                        {filtered.demand > CAPACITY ? (
                          <span className="cal-day-tag over">OVER</span>
                        ) : filtered.demand >= 35 ? (
                          <span className="cal-day-tag warn">PEAK</span>
                        ) : null}
                      </div>

                      <div className="cal-events">
                        {filtered.events.slice(0, 3).map((evt, evtIdx) => (
                          <div key={evtIdx} className={`cal-event ${clientClass(evt.client)}`} title={`${evt.name} · ${CLIENT_META[evt.client]?.label || evt.client}`}>
                            {cleanEventName(evt.name)}
                          </div>
                        ))}
                        {filtered.events.length > 3 && (
                          <div className="cal-event-more">+{filtered.events.length - 3} more</div>
                        )}
                      </div>

                      {filtered.demand > 0 && (
                        <div className="cal-day-bottom">
                          <span className={`cal-day-load ${filtered.demand > CAPACITY ? 'over' : filtered.demand >= 35 ? 'warn' : ''}`}>
                            {filtered.demand} / {CAPACITY}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : view === 'quarter' ? (
              renderQuarterView()
            ) : view === 'year' ? (
              renderYearView()
            ) : view === 'gantt' ? (
              <div className="cal-gantt">
                {/* Gantt Search Bar */}
                <div className="cgg-search-bar">
                  <div className="input-wrap" style={{ width: '340px' }}>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      className="input"
                      placeholder="Search trainer by name or ID..."
                      value={ganttSearch}
                      onChange={(e) => setGanttSearch(e.target.value)}
                    />
                  </div>
                  <div className="cgg-engage-toggle">
                    <button
                      className={trainerToggle === 'engaged' ? 'active' : ''}
                      onClick={() => setTrainerToggle('engaged')}
                    >
                      Engaged
                    </button>
                    <button
                      className={trainerToggle === 'all' ? 'active' : ''}
                      onClick={() => setTrainerToggle('all')}
                    >
                      All
                    </button>
                  </div>
                  <div className="cgg-engage-meta">
                    <b>{filteredTrainers.length}</b> trainers · <b>28</b> days
                  </div>
                </div>

                {/* Gantt Day Header Row */}
                <div className="cgg-head">
                  <div className="cgg-head-trainer">Trainer</div>
                  {ganttDays.map((d, i) => {
                    const isWE = d.getDay() === 0 || d.getDay() === 6;
                    const isTd = isSameDate(d, new Date(2026, 4, 22));
                    return (
                      <div key={i} className={`cgg-head-day${isWE ? ' weekend' : ''}${isTd ? ' today' : ''}`}>
                        {DOW[d.getDay()][0]}
                        <strong>{d.getDate()}</strong>
                      </div>
                    );
                  })}
                </div>

                {/* Gantt Trainer Rows */}
                {filteredTrainers.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', font: '600 12px var(--font)' }}>
                    No engaged trainers found.
                  </div>
                ) : (
                  filteredTrainers.map((t, idx) => (
                    <div className="cgg-row" key={t.id || idx}>
                      <div className="cgg-row-name">
                        <span className="n">{t.name}</span>
                        <span className="s">{t.id} · {t.type || 'Internal'}</span>
                      </div>
                      <div className="cgg-row-track">
                        {t.bars?.map((bar, barIdx) => (
                          <div
                            key={barIdx}
                            className={`cgg-bar c-${bar.client || 'other'}`}
                            style={{ gridColumn: `${bar.start_day} / span ${bar.span}` }}
                            title={`${bar.programme} · ${CLIENT_META[bar.client]?.label || bar.client || 'Unknown Client'}`}
                          >
                            {bar.programme}
                          </div>
                        ))}
                        {todayIndex !== -1 && (
                          <div
                            className="cgg-today-line"
                            style={{
                              gridColumn: `${todayIndex + 1} / span 1`,
                              left: 0
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>

          {/* Color-coding Legend */}
          {view !== 'gantt' && (
            <div className="cal-legend">
              <div className="cal-leg-item"><span className="sw idle"></span>0–10 demand</div>
              <div className="cal-leg-item"><span className="sw light"></span>10–20</div>
              <div className="cal-leg-item"><span className="sw mid"></span>20–35</div>
              <div className="cal-leg-item"><span className="sw warn"></span>35–42 (near capacity)</div>
              <div className="cal-leg-item"><span className="sw over"></span>Over capacity</div>
              <div className="cal-leg-item" style={{ marginLeft: 'auto' }}>
                <span className="sw today-leg"></span>Today
              </div>
              <div className="cal-leg-item"><span className="sw weekend-leg"></span>Weekend</div>
            </div>
          )}

          {/* Client Color Legend */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
            padding: '10px 14px',
            background: 'var(--bg-primary)',
            borderRadius: '8px',
            marginTop: '8px',
          }}>
            <span style={{ font: '800 9px/1 var(--font)', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', marginRight: '4px' }}>Client Colors</span>
            {Object.entries(CLIENT_META).filter(([k]) => k !== 'other').map(([key, meta]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
                onClick={() => setClientFilter(clientFilter === key ? 'all' : key)}>
                <span style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: meta.color,
                  boxShadow: `0 0 6px ${meta.color}88`,
                  display: 'inline-block',
                  flexShrink: 0,
                  outline: clientFilter === key ? `2px solid ${meta.color}` : 'none',
                  outlineOffset: '2px',
                }} />
                <span style={{
                  font: '700 10px/1 var(--font)',
                  color: clientFilter === key ? meta.color : 'var(--text-muted)',
                  transition: 'color 0.15s',
                }}>{meta.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Week-of Refocus Panel */}
      <div className="card" id="weekGridSection">
        <div className="section-head">
          <div>
            <div className="section-title">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              Week of{' '}
              <span id="weekLabel" style={{ color: 'var(--accent-text)', marginLeft: '6px' }}>
                {getWeekLabel()}
              </span>
            </div>
            <div className="section-sub" style={{ marginTop: '6px' }}>
              Click any day on the calendar above to refocus the week here
            </div>
          </div>
          <div className="section-actions">
            <button className="cal-nav-btn" onClick={handleWeekPrev} aria-label="Previous week">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button className="cal-nav-btn" onClick={handleWeekNext} aria-label="Next week">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {loadingWeek ? (
          <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center', width: '100%' }}>
            <span style={{ font: '600 13px var(--font)', color: 'var(--text-muted)' }}>Refreshing Week View...</span>
          </div>
        ) : (
          <>
            <div className="week-grid" id="weekGrid">
              {weekDays.map((d, idx) => {
                const dateStr = key(d);
                const isToday = isSameDate(d, new Date(2026, 4, 22));
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                const backendDay = weekData?.week_data?.find((wd) => wd.date === dateStr) || { demand: 0, events: [] };
                const filtered = getFilteredDayData(backendDay.events, backendDay.demand);

                let stateCls = '';
                if (isWeekend) stateCls += ' weekend';
                if (isToday) stateCls += ' today';
                if (filtered.demand > CAPACITY) stateCls += ' over';
                else if (filtered.demand >= 35) stateCls += ' warn';

                const demandPct = Math.min((filtered.demand / CAPACITY) * 100, 100);
                const taPct = Math.min((filtered.events.length * 8 / CAPACITY) * 100, 100);

                return (
                  <div
                    key={idx}
                    className={`wd-cell${stateCls}`}
                    onClick={() => setSelectedDate(d)}
                  >
                    <div className="wd-head">
                      <span className="wd-dow">{DOW[d.getDay()]}</span>
                      <span className="wd-num">{d.getDate()}</span>
                    </div>
                    <div className="wd-bar-stack">
                      <div className="wd-bar demand"><i style={{ width: `${demandPct}%` }}></i></div>
                      <div className="wd-bar ta"><i style={{ width: `${taPct}%` }}></i></div>
                    </div>
                    <div className="wd-stats">
                      <span>
                        <span className={`wd-stat-num ${filtered.demand > CAPACITY ? 'over' : filtered.demand >= 35 ? 'warn' : ''}`}>
                          {filtered.demand}
                        </span>{' '}
                        <span className="wd-stat-lab">DEM</span>
                      </span>
                      <span>
                        <span className="wd-stat-num">{filtered.events.length}</span>{' '}
                        <span className="wd-stat-lab">PROG</span>
                      </span>
                    </div>
                    <div className="wd-progs">
                      {filtered.events.slice(0, 2).map((evt, evtIdx) => (
                        <div key={evtIdx} className={`wd-prog-chip ${clientClass(evt.client)}`} title={`${evt.name} · ${CLIENT_META[evt.client]?.label || evt.client}`}>
                          {cleanEventName(evt.name)}
                        </div>
                      ))}
                      {filtered.events.length > 2 && (
                        <div className="wd-prog-more">+{filtered.events.length - 2}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '18px' }}>
              <div className="kpi-label" style={{ marginBottom: '10px' }}>PROGRAMMES RUNNING THIS WEEK</div>
              <div className="week-progs" id="weekProgs">
                {filteredWeekProgs.length === 0 ? (
                  <div style={{ padding: '14px', color: 'var(--text-muted)', font: '600 12px var(--font)', textAlign: 'center', width: '100%' }}>
                    No programmes match the current track + client filter.
                  </div>
                ) : (
                  filteredWeekProgs.map((p, idx) => (
                    <button
                      type="button"
                      className={`wp-card wp-card-btn ${clientClass(p.client)}`}
                      key={p.delivery_id || idx}
                      onClick={() => p.delivery_id && setProgDetailId(p.delivery_id)}
                      title="Click for details"
                    >
                      <div className="wp-bar"></div>
                      <div className="wp-body">
                        <div className="wp-name" title={p.name}>{p.name}</div>
                        <div className="wp-code" style={{ color: CLIENT_META[p.client]?.color || 'var(--text-muted)' }}>
                          {CLIENT_META[p.client]?.label || p.client?.toUpperCase()} · {p.track?.toUpperCase()}
                        </div>
                        <div className="wp-meta">
                          <span><b>{p.days_this_week}</b> days this week</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <ProgrammeDetailModal
        progId={progDetailId}
        progFromWeek={filteredWeekProgs.find((p) => p.delivery_id === progDetailId)}
        delivery={progDetailId ? deliveryByIdMap.get(progDetailId) : null}
        onClose={() => setProgDetailId(null)}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Programme detail modal — opens when a "Programmes Running This Week" card
// is clicked. Pulls the matching delivery from /deliveries (already cached
// in the Redux store) for the rich detail; falls back to the week summary
// when the delivery isn't found.
// ---------------------------------------------------------------------------
function ProgrammeDetailModal({ progId, progFromWeek, delivery, onClose }) {
  if (!progId) return null;

  const fmtDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-GB', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const dayCount = (s, e) => {
    if (!s || !e) return null;
    try {
      const diff = Math.round((new Date(e) - new Date(s)) / 864e5) + 1;
      return diff > 0 ? diff : null;
    } catch { return null; }
  };

  const name = delivery?.course_name || progFromWeek?.name || progId;
  const client = delivery?.campus || progFromWeek?.client || '—';
  const track = progFromWeek?.track?.toUpperCase() || '—';
  const status = delivery?.status || 'Unknown';
  const startDate = delivery?.start_date;
  const endDate = delivery?.end_date;
  const totalDays = dayCount(startDate, endDate);
  const daysThisWeek = progFromWeek?.days_this_week ?? null;
  const trainers = delivery?.trainers || [];
  const trainerCount = delivery?.trainer_count ?? trainers.length;
  const taCount = delivery?.ta_count ?? 0;
  const totalSlots = delivery?.total_slots ?? 0;
  const filledSlots = delivery?.filled_slots ?? 0;
  const gap = delivery?.gap ?? null;
  const risk = delivery?.risk_level || null;

  const statusTone = (() => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'training completed') return 'ok';
    if (s === 'ongoing') return 'live';
    if (s === 'upcoming') return 'warn';
    return 'neutral';
  })();
  const riskTone = (risk || '').toLowerCase() === 'high'
    ? 'err'
    : (risk || '').toLowerCase() === 'med' ? 'warn' : 'ok';

  return (
    <div className="prog-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="prog-panel" onClick={(e) => e.stopPropagation()}>
        <header className="prog-head">
          <div className="prog-head-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <div className="prog-head-meta">
            <div className="prog-head-title">{name}</div>
            <div className="prog-head-sub">
              <span className="prog-id">{progId}</span>
              <span className="dot-sep">·</span>
              <span>{client}</span>
              {track !== '—' && (
                <>
                  <span className="dot-sep">·</span>
                  <span>{track}</span>
                </>
              )}
            </div>
          </div>
          <button type="button" className="prog-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="prog-body">
          {/* Status row */}
          <div className="prog-row">
            <span className={`prog-chip prog-chip-${statusTone}`}>{status}</span>
            {risk && <span className={`prog-chip prog-chip-${riskTone}`}>Risk · {risk}</span>}
            {daysThisWeek != null && (
              <span className="prog-chip prog-chip-neutral">{daysThisWeek} days this week</span>
            )}
          </div>

          {/* Date span */}
          <div className="prog-grid">
            <div className="prog-stat">
              <div className="prog-stat-key">START DATE</div>
              <div className="prog-stat-val">{fmtDate(startDate)}</div>
            </div>
            <div className="prog-stat">
              <div className="prog-stat-key">END DATE</div>
              <div className="prog-stat-val">{fmtDate(endDate)}</div>
            </div>
            <div className="prog-stat">
              <div className="prog-stat-key">DURATION</div>
              <div className="prog-stat-val">{totalDays != null ? `${totalDays} days` : '—'}</div>
            </div>
          </div>

          {/* Allocation summary */}
          <div className="prog-grid">
            <div className="prog-stat">
              <div className="prog-stat-key">TRAINERS</div>
              <div className="prog-stat-val">{trainerCount}</div>
            </div>
            <div className="prog-stat">
              <div className="prog-stat-key">TAs</div>
              <div className="prog-stat-val">{taCount}</div>
            </div>
            <div className="prog-stat">
              <div className="prog-stat-key">SLOTS FILLED</div>
              <div className="prog-stat-val">
                {filledSlots} <span className="prog-stat-of">/ {totalSlots}</span>
              </div>
            </div>
            {gap != null && gap > 0 && (
              <div className="prog-stat prog-stat-warn">
                <div className="prog-stat-key">GAP</div>
                <div className="prog-stat-val">{gap}</div>
              </div>
            )}
          </div>

          {/* Trainers list */}
          {trainers.length > 0 && (
            <div className="prog-section">
              <div className="prog-section-head">
                Trainers Allocated <span className="prog-section-count">{trainers.length}</span>
              </div>
              <div className="prog-trainers">
                {trainers.slice(0, 30).map((t, i) => (
                  <span key={`${t}-${i}`} className="prog-trainer-chip">
                    <span className="prog-trainer-dot" />
                    {t}
                  </span>
                ))}
                {trainers.length > 30 && (
                  <span className="prog-trainer-more">+{trainers.length - 30} more</span>
                )}
              </div>
            </div>
          )}

          {trainers.length === 0 && delivery && (
            <div className="prog-empty">
              No trainers allocated yet for this delivery.
            </div>
          )}

          {!delivery && (
            <div className="prog-empty">
              Detailed delivery record not yet loaded for <strong>{progId}</strong>. Showing what's available from the week summary.
            </div>
          )}
        </div>

        <footer className="prog-foot">
          <button type="button" className="prog-foot-ghost" onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>
  );
}
