import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  useGetCalendarDataQuery,
  useGetCalendarGanttQuery,
  useGetDeliveriesQuery,
} from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';
import { exportToExcel } from '../lib/exportExcel.js';

/* ============================================================
   Calendar — Google-Calendar-style planning surface
   ------------------------------------------------------------
   Views: Week · Month · Quarter · Year · Gantt.
   One year-wide /calendar-data fetch feeds Week/Month/Quarter/
   Year + the day-detail modal; /calendar-gantt feeds Gantt.
   Searchable Track + Client filters are derived from the live
   backend data (no hardcoded vocab). Every day cell is
   clickable → a modal listing all programmes for that date,
   enriched from /deliveries. No mock data.
   ============================================================ */

const TODAY = new Date(); // real current date — drives "today" highlight across all views
const CAPACITY = 42;

const DOW   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_S = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TRACK_LABEL = {
  java: 'Java FS', python: 'Python / ML', react: 'React / JS', cloud: 'Cloud & DevOps',
  testing: 'Testing / QA', data: 'Data / Analytics', cyber: 'Cyber Security', sap: 'SAP', other: 'Other',
};
const CLIENT_META = {
  parul:    { color: '#6366f1', label: 'Parul Univ' },    // Indigo
  skg:      { color: '#34d399', label: 'SKG' },           // Emerald
  lti:      { color: '#06b6d4', label: 'LTIMindtree' },   // Cyan
  kct:      { color: '#fbbf24', label: 'KCT' },           // Amber
  hexaware: { color: '#f97316', label: 'Hexaware' },      // Orange
  iamneo:   { color: '#c084fc', label: 'iamneo' },        // Purple
  stjoseph: { color: '#ef4444', label: 'St. Joseph' },    // Red
  vit:      { color: '#22d3a5', label: 'VIT' },           // Green
  rec:      { color: '#f472b6', label: 'REC' },           // Pink
  bit:      { color: '#3b82f6', label: 'BIT' },           // Blue
  virtusa:  { color: '#a78bfa', label: 'Virtusa' },       // Violet
  other:    { color: '#64748b', label: 'Other' },         // Gray
};
const clientColor = (c) => CLIENT_META[c]?.color || CLIENT_META.other.color;
const clientLabel = (c) => CLIENT_META[c]?.label || (c ? c.toUpperCase() : 'Other');
const trackLabel  = (t) => TRACK_LABEL[t] || (t ? t.toUpperCase() : 'Other');

// Local YYYY-MM-DD key (matches backend's local-date keys).
const isoKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const sameDate = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function cleanEventName(name) {
  if (!name) return '';
  let s = name;
  s = s.replace(/^(Exam Reporting|Summer Residential|Residential Phase\s*\d+|SKG Electives)\s*:\s*/i, '');
  for (const sp of ['|', '·']) if (s.includes(sp)) s = s.split(sp)[0].trim();
  if (s.includes(':')) { const p = s.split(':').map((x) => x.trim()); s = p[p.length - 1]; }
  s = s.trim();
  return s.length > 26 ? s.slice(0, 24) + '…' : s;
}

const fmtFullDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
};

export default function Calendar({ active }) {
  const [view, setView] = useState('month');                 // week | month | quarter | year | gantt
  const [cursor, setCursor] = useState(() => new Date(TODAY));
  const [selected, setSelected] = useState(() => new Date(TODAY));
  const [trackF, setTrackF] = useState('');
  const [clientF, setClientF] = useState('');
  const [modalDate, setModalDate] = useState(null);          // ISO string of clicked day
  const [ganttSearch, setGanttSearch] = useState('');
  const [trainerToggle, setTrainerToggle] = useState('engaged');
  // 'all' = show every programme active on the day (month / quarter / year)
  // 'starting' = show only programmes whose delivery starts on that day (week view)
  const [modalMode, setModalMode] = useState('all');

  const cursorYear = cursor.getFullYear();

  // ---- Backend data (year-wide; one fetch powers all non-gantt views) ----
  const { data: yearRes, isFetching: loadingYear, error: yearErr } =
    useGetCalendarDataQuery({ year: cursorYear });
  const calendarData = yearRes?.calendar_data || {};

  const { data: ganttRes, isFetching: loadingGantt, error: ganttErr } =
    useGetCalendarGanttQuery(
      { start_date: isoKey(cursor), days: 28 },
      { skip: view !== 'gantt' },
    );

  const { data: deliveriesData } = useGetDeliveriesQuery({});
  const deliveryById = useMemo(() => {
    const m = new Map();
    (deliveriesData?.deliveries || []).forEach((d) => { if (d.delivery_id) m.set(d.delivery_id, d); });
    return m;
  }, [deliveriesData]);

  const error = yearErr || ganttErr;

  // ---- Filter vocabularies derived from the live data ----
  const { trackOpts, clientOpts } = useMemo(() => {
    const tracks = new Set(), clients = new Set();
    Object.values(calendarData).forEach((day) => {
      (day.events || []).forEach((e) => {
        if (e.track) tracks.add(e.track);
        if (e.client) clients.add(e.client);
      });
    });
    const tOpts = [...tracks].sort().map((v) => ({ value: v, label: trackLabel(v) }));
    const cOpts = [...clients].sort().map((v) => ({ value: v, label: clientLabel(v) }));
    return { trackOpts: tOpts, clientOpts: cOpts };
  }, [calendarData]);

  // Filtered + grouped programmes for a given ISO date.
  // Only events with an assigned trainer are counted — status-only cells
  // ("No Class", "Training Completed", "Not Yet Started") arrive as trainer=""
  // from the backend and are excluded here so the count reflects real activity.
  const dayData = useCallback((iso) => {
    const raw = calendarData[iso] || { events: [] };
    // 1. Apply track / client filters AND drop status-only (empty trainer) events.
    const filtered = (raw.events || []).filter((e) => {
      if (!e.trainer) return false;                         // status cell — skip
      if (trackF && e.track !== trackF) return false;
      if (clientF && e.client !== clientF) return false;
      return true;
    });
    // 2. Collapse per-assignment events into one entry per delivery.
    const map = new Map();
    for (const e of filtered) {
      const key = e.delivery_id || e.name || JSON.stringify(e);
      if (!map.has(key)) {
        map.set(key, {
          name: e.name, delivery_id: e.delivery_id,
          campus: e.campus, track: e.track, client: e.client,
          trainers: new Set(),
        });
      }
      map.get(key).trainers.add(e.trainer);
    }
    const programmes = [...map.values()].map((g) => ({ ...g, trainers: [...g.trainers] }));
    const trainerCount = new Set(filtered.map((e) => e.trainer)).size;
    return { programmes, assignments: filtered.length, trainerCount };
  }, [calendarData, trackF, clientF]);

  // Month / quarter / year click → show all active programmes for that date
  const openDay = useCallback((d) => {
    setModalDate(isoKey(d));
    setModalMode('all');
  }, []);

  // Week click → show only programmes that START on that date (less clutter)
  const openDayWeek = useCallback((d) => {
    setModalDate(isoKey(d));
    setModalMode('starting');
  }, []);

  // Variant of dayData filtered to deliveries whose start_date === iso.
  // Falls back to showing the programme if no enrichment data is available.
  const dayDataStarting = useCallback((iso) => {
    const base = dayData(iso);
    const startingProgs = base.programmes.filter((p) => {
      const del = deliveryById.get(p.delivery_id);
      if (!del) return true; // no enrichment → include rather than hide
      return del.start_date === iso;
    });
    return { ...base, programmes: startingProgs };
  }, [dayData, deliveryById]);

  // ---- Navigation ----
  const shift = (dir) => {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'quarter') d.setMonth(d.getMonth() + dir * 3);
    else if (view === 'year') d.setFullYear(d.getFullYear() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir * 28); // gantt
    setCursor(d);
    if (view === 'week') setSelected(d);
  };
  const goToday = () => { setCursor(new Date(TODAY)); setSelected(new Date(TODAY)); };

  const navLabel = () => {
    if (view === 'year') return `${cursorYear}`;
    if (view === 'quarter') return `Q${Math.floor(cursor.getMonth() / 3) + 1} ${cursorYear}`;
    if (view === 'gantt') {
      const end = new Date(cursor); end.setDate(cursor.getDate() + 27);
      const f = (d) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
      return `${f(cursor)} – ${f(end)} ${end.getFullYear()}`;
    }
    if (view === 'week') {
      const wd = weekDays(selected);
      const s = wd[0], e = wd[6];
      const same = s.getMonth() === e.getMonth();
      return same
        ? `${s.getDate()}–${e.getDate()} ${MONTHS_SHORT[s.getMonth()]} ${s.getFullYear()}`
        : `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} – ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]} ${s.getFullYear()}`;
    }
    return `${MONTHS[cursor.getMonth()]} ${cursorYear}`;
  };

  // ---- Export current view's events ----
  const handleExport = () => {
    const rows = [];
    Object.keys(calendarData).sort().forEach((iso) => {
      dayData(iso).programmes.forEach((p) => rows.push({ date: iso, ...p }));
    });
    if (!rows.length) return;
    exportToExcel({
      filename: 'calendar-programmes',
      sheets: [{
        name: 'Calendar',
        columns: [
          { header: 'Date', key: 'date' },
          { header: 'Programme', key: 'name' },
          { header: 'Delivery ID', key: 'delivery_id' },
          { header: 'Track', value: (r) => trackLabel(r.track) },
          { header: 'Client', value: (r) => clientLabel(r.client) },
          { header: 'Campus', key: 'campus' },
          { header: 'Trainers', value: (r) => (r.trainers || []).join(', ') || 'Unassigned' },
          { header: 'Trainer Count', value: (r) => (r.trainers || []).length },
        ],
        rows,
      }],
    });
  };

  if (error) {
    return <ErrorPanel panelId="calendar" active={active}
      error={error?.error || error?.message || 'Failed to load calendar data.'}
      onRetry={() => window.location.reload()} />;
  }
  if (loadingYear && !yearRes) return <LoadingPanel panelId="calendar" active={active} />;

  const VIEWS = ['week', 'month', 'quarter', 'year', 'gantt'];

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="calendar">
      <div className="card gc-card">
        {/* ---- Toolbar ---- */}
        <div className="gc-toolbar">
          <div className="gc-nav">
            <button className="gc-nav-btn" onClick={() => shift(-1)} aria-label="Previous">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button className="gc-today" onClick={goToday}>Today</button>
            <button className="gc-nav-btn" onClick={() => shift(1)} aria-label="Next">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <div className="gc-period">{navLabel()}</div>
          </div>

          <div className="gc-toolbar-right">
            <SearchSelect label="Track"  value={trackF}  options={trackOpts}  onChange={setTrackF} />
            <SearchSelect label="Client" value={clientF} options={clientOpts} onChange={setClientF} />
            <button className="gc-export" onClick={handleExport} title="Export programmes to Excel">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
            <div className="gc-views" role="tablist">
              {VIEWS.map((v) => (
                <button key={v} role="tab" aria-selected={view === v}
                  className={`gc-view-btn${view === v ? ' is-active' : ''}`}
                  onClick={() => setView(v)}>
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ---- Legend ---- */}
        {view !== 'gantt' && (
          <div className="gc-legend">
            <span className="gc-legend-title">Clients</span>
            {Object.entries(CLIENT_META).filter(([k]) => k !== 'other').map(([k, m]) => (
              <button key={k} type="button"
                className={`gc-legend-item${clientF === k ? ' is-active' : ''}`}
                onClick={() => setClientF(clientF === k ? '' : k)}>
                <span className="gc-legend-dot" style={{ background: m.color, boxShadow: `0 0 6px ${m.color}88` }} />
                {m.label}
              </button>
            ))}
          </div>
        )}

        {/* ---- View body ---- */}
        <div className="gc-body">
          {loadingYear && !yearRes ? (
            <div className="gc-loading">Loading…</div>
          ) : view === 'month'   ? <MonthView  cursor={cursor} dayData={dayData} onDay={openDay} />
            : view === 'week'    ? <WeekView   selected={selected} dayData={dayData} onDay={openDayWeek} />
            : view === 'quarter' ? <MiniGrid   months={quarterMonths(cursor)} cols={3} dayData={dayData} onDay={openDay} />
            : view === 'year'    ? <MiniGrid   months={yearMonths(cursorYear)} cols={4} dayData={dayData} onDay={openDay} />
            : <GanttView gantt={ganttRes} loading={loadingGantt} cursor={cursor}
                         search={ganttSearch} setSearch={setGanttSearch}
                         toggle={trainerToggle} setToggle={setTrainerToggle} />}
        </div>
      </div>

      {modalDate && (
        <DayDetailModal
          iso={modalDate}
          data={modalMode === 'starting' ? dayDataStarting(modalDate) : dayData(modalDate)}
          deliveryById={deliveryById}
          scopeNote={modalMode === 'starting' ? 'Programmes starting on this date' : null}
          onClose={() => setModalDate(null)}
        />
      )}
    </section>
  );
}

/* ============================================================
   Date helpers
   ============================================================ */
function weekDays(anchor) {
  const dow = anchor.getDay();
  const sun = new Date(anchor); sun.setDate(anchor.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(sun); d.setDate(sun.getDate() + i); return d; });
}
function monthCells(year, month) {
  const first = new Date(year, month, 1);
  const offset = first.getDay();
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, i - offset + 1));
}
function quarterMonths(cursor) {
  const y = cursor.getFullYear(), qs = Math.floor(cursor.getMonth() / 3) * 3;
  return Array.from({ length: 3 }, (_, i) => new Date(y, qs + i, 1));
}
function yearMonths(year) {
  return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
}

/* ============================================================
   Month view
   ============================================================ */
function MonthView({ cursor, dayData, onDay }) {
  const cells = monthCells(cursor.getFullYear(), cursor.getMonth());
  return (
    <div className="gc-month">
      {DOW.map((d, i) => (
        <div key={d} className={`gc-month-dow${i === 0 || i === 6 ? ' we' : ''}`}>{d}</div>
      ))}
      {cells.map((d, i) => {
        const iso = isoKey(d);
        const { programmes, trainerCount } = dayData(iso);
        const inMonth = d.getMonth() === cursor.getMonth();
        const isToday = sameDate(d, TODAY);
        const we = d.getDay() === 0 || d.getDay() === 6;
        // Unique clients for the coloured-dot strip (up to 5)
        const uniqueClients = [...new Set(programmes.map((p) => p.client))].slice(0, 5);
        return (
          <div key={i}
            className={`gc-cell${inMonth ? '' : ' out'}${we ? ' we' : ''}${isToday ? ' today' : ''}`}
            onClick={() => onDay(d)}>
            <div className="gc-cell-num">{d.getDate()}</div>
            <div className="gc-cell-events">
              {programmes.length > 0 && (
                <div className="gc-cell-summary"
                  title={`${programmes.length} active programme(s) · ${trainerCount} trainer(s)`}>
                  <span className="gc-count-num">{programmes.length}</span>
                  <span className="gc-count-lbl">active</span>
                  <div className="gc-count-dots">
                    {uniqueClients.map((c, ci) => (
                      <span key={ci} className="gc-count-dot" style={{ background: clientColor(c) }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   Week view — 7 day columns
   Count badge instead of listing all chips.
   Click opens modal scoped to programmes STARTING that day.
   ============================================================ */
function WeekView({ selected, dayData, onDay }) {
  const days = weekDays(selected);
  return (
    <div className="gc-week">
      {days.map((d, i) => {
        const iso = isoKey(d);
        const { programmes, trainerCount } = dayData(iso);
        const isToday = sameDate(d, TODAY);
        const we = d.getDay() === 0 || d.getDay() === 6;
        const uniqueClients = [...new Set(programmes.map((p) => p.client))].slice(0, 4);
        return (
          <div key={i} className={`gc-week-col${we ? ' we' : ''}${isToday ? ' today' : ''}`} onClick={() => onDay(d)}>
            <div className="gc-week-head">
              <span className="gc-week-dow">{DOW[d.getDay()]}</span>
              <span className="gc-week-num">{d.getDate()}</span>
            </div>
            <div className="gc-week-events">
              {programmes.length === 0 ? (
                <div className="gc-week-empty">—</div>
              ) : (
                <div className="gc-wcount"
                  title={`${programmes.length} active programme(s) · ${trainerCount} trainer(s) · click to see programmes starting today`}>
                  <span className="gc-wcount-n">{programmes.length}</span>
                  <span className="gc-wcount-lbl">active</span>
                  {trainerCount > 0 && (
                    <span className="gc-wcount-trainers">{trainerCount} trainer{trainerCount === 1 ? '' : 's'}</span>
                  )}
                  <div className="gc-count-dots">
                    {uniqueClients.map((c, ci) => (
                      <span key={ci} className="gc-count-dot" style={{ background: clientColor(c) }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   Quarter / Year — grid of mini-months
   ============================================================ */
function MiniGrid({ months, cols, dayData, onDay }) {
  return (
    <div className="gc-mini-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {months.map((mDate) => {
        const y = mDate.getFullYear(), m = mDate.getMonth();
        const cells = monthCells(y, m);
        return (
          <div className="gc-mini" key={`${y}-${m}`}>
            <div className="gc-mini-title">{MONTHS_SHORT[m]} {y}</div>
            <div className="gc-mini-week">{DOW_S.map((d, i) => <span key={i}>{d}</span>)}</div>
            <div className="gc-mini-days">
              {cells.map((d, i) => {
                const { programmes, trainerCount } = dayData(isoKey(d));
                const inMonth = d.getMonth() === m;
                const isToday = sameDate(d, TODAY);
                // Heat level based on trainer utilisation vs capacity (42).
                // Falls back to l1 if there are programmes but no trainers yet assigned.
                const lvl = programmes.length === 0
                  ? 'l0'
                  : trainerCount >= CAPACITY     ? 'l5'  // at/over capacity → red
                  : trainerCount >= 35           ? 'l4'  // 83%+ → orange
                  : trainerCount >= 20           ? 'l3'  // 48%+ → yellow
                  : trainerCount >= 5            ? 'l2'  // 12%+ → mid-green
                  : 'l1';                                 // <5 trainers or unassigned → light-green
                return (
                  <button key={i} type="button"
                    className={`gc-mini-day ${lvl}${inMonth ? '' : ' out'}${isToday ? ' today' : ''}`}
                    title={`${d.toDateString()} · ${programmes.length} programme(s) · ${trainerCount} trainer(s)`}
                    onClick={() => onDay(d)}>
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   Gantt view (trainer × day)
   ============================================================ */
function GanttView({ gantt, loading, cursor, search, setSearch, toggle, setToggle }) {
  const days = useMemo(
    () => Array.from({ length: 28 }, (_, i) => { const d = new Date(cursor); d.setDate(cursor.getDate() + i); return d; }),
    [cursor],
  );
  const todayIdx = days.findIndex((d) => sameDate(d, TODAY));

  const trainers = useMemo(() => {
    return (gantt?.trainers || []).filter((t) => {
      const q = search.toLowerCase();
      const match = t.name.toLowerCase().includes(q) || (t.id || '').toLowerCase().includes(q);
      if (!match) return false;
      if (toggle === 'engaged' && (!t.bars || t.bars.length === 0)) return false;
      return true;
    });
  }, [gantt, search, toggle]);

  if (loading && !gantt) return <div className="gc-loading">Loading Gantt…</div>;

  return (
    <div className="cal-gantt">
      <div className="cgg-search-bar">
        <div className="input-wrap" style={{ width: '340px' }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input className="input" placeholder="Search trainer by name or ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="cgg-engage-toggle">
          <button className={toggle === 'engaged' ? 'active' : ''} onClick={() => setToggle('engaged')}>Engaged</button>
          <button className={toggle === 'all' ? 'active' : ''} onClick={() => setToggle('all')}>All</button>
        </div>
        <div className="cgg-engage-meta"><b>{trainers.length}</b> trainers · <b>28</b> days</div>
      </div>

      <div className="cgg-head">
        <div className="cgg-head-trainer">Trainer</div>
        {days.map((d, i) => {
          const we = d.getDay() === 0 || d.getDay() === 6;
          const td = sameDate(d, TODAY);
          return <div key={i} className={`cgg-head-day${we ? ' weekend' : ''}${td ? ' today' : ''}`}>{DOW[d.getDay()][0]}<strong>{d.getDate()}</strong></div>;
        })}
      </div>

      {trainers.length === 0 ? (
        <div className="gc-loading">No engaged trainers in this window.</div>
      ) : trainers.map((t, idx) => (
        <div className="cgg-row" key={`${t.id || 't'}-${idx}`}>
          <div className="cgg-row-name">
            <span className="n">{t.name}</span>
            <span className="s">{t.id} · {t.type || 'Internal'}</span>
          </div>
          <div className="cgg-row-track">
            {t.bars?.map((bar, bi) => (
              <div key={bi} className={`cgg-bar c-${bar.client || 'other'}`}
                style={{ gridColumn: `${bar.start_day} / span ${bar.span}` }}
                title={`${bar.programme} · ${trackLabel(bar.track)}`}>
                {bar.programme}
              </div>
            ))}
            {todayIdx !== -1 && <div className="cgg-today-line" style={{ gridColumn: `${todayIdx + 1} / span 1`, left: 0 }} />}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Searchable dropdown filter (reuses .rq-select styling)
   ============================================================ */
function SearchSelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const n = q.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(n));
  }, [options, q]);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <div ref={ref} className={`rq-select${open ? ' is-open' : ''}${value ? ' is-set' : ''}`}>
      <button type="button" className="rq-select-trigger" onClick={() => setOpen((v) => !v)}>
        <span className="rq-select-label">{label}</span>
        <span className="rq-select-value">{selectedLabel || 'All'}</span>
        {value ? (
          <span className="rq-select-clear" role="button" aria-label={`Clear ${label}`}
            onClick={(e) => { e.stopPropagation(); onChange(''); setQ(''); }}>×</span>
        ) : (
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rq-select-caret"><polyline points="6 9 12 15 18 9" /></svg>
        )}
      </button>
      {open && (
        <div className="rq-select-menu">
          <div className="rq-select-search">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label.toLowerCase()}…`} />
          </div>
          <div className="rq-select-list">
            <button type="button" className={`rq-select-opt${!value ? ' is-active' : ''}`} onClick={() => { onChange(''); setOpen(false); setQ(''); }}>All</button>
            {filtered.length === 0 ? (
              <div className="rq-select-empty">No matches</div>
            ) : filtered.map((opt) => (
              <button key={opt.value} type="button"
                className={`rq-select-opt${value === opt.value ? ' is-active' : ''}`}
                onClick={() => { onChange(opt.value); setOpen(false); setQ(''); }} title={opt.label}>
                {opt.label}
              </button>
            ))}
          </div>
          <div className="rq-select-foot">{filtered.length} option{filtered.length === 1 ? '' : 's'}</div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Day detail modal — all programmes for the clicked date
   ============================================================ */
function DayDetailModal({ iso, data, deliveryById, scopeNote, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { programmes, assignments, trainerCount } = data;
  const dateObj = new Date(iso);
  const niceDate = dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="oa-det-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="oa-det-panel" role="dialog" aria-modal="true" aria-label={`Programmes on ${niceDate}`}>
        <div className="oa-det-head">
          <div className="oa-det-avatar" style={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: '#fff' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <div className="oa-det-info">
            <div className="oa-det-name">{niceDate}</div>
            {scopeNote && (
              <div className="gc-modal-scope">{scopeNote}</div>
            )}
            <div className="oa-det-sub">
              <span className="oa-tbl-avail oa-avail-full">{programmes.length} programme{programmes.length === 1 ? '' : 's'}</span>
              <span className="oa-tbl-pool oa-pool-int">{trainerCount} trainer{trainerCount === 1 ? '' : 's'}</span>
              <span className="oa-tbl-pool oa-pool-frl">{assignments} assignment{assignments === 1 ? '' : 's'}</span>
            </div>
          </div>
          <button type="button" className="oa-det-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="oa-det-body">
          {programmes.length === 0 ? (
            <div className="gc-day-empty">No programmes scheduled for this date (with the current filters).</div>
          ) : (
            <div className="gc-day-list">
              {programmes.map((p, i) => {
                const del = deliveryById.get(p.delivery_id);
                const dayTrainers = p.trainers || [];
                return (
                  <div key={i} className="gc-day-item" style={{ '--c': clientColor(p.client) }}>
                    <div className="gc-day-item-bar" />
                    <div className="gc-day-item-body">
                      <div className="gc-day-item-title">{p.name || '—'}</div>
                      <div className="gc-day-item-chips">
                        <span className="gc-tag" style={{ color: clientColor(p.client), borderColor: clientColor(p.client) + '55' }}>{clientLabel(p.client)}</span>
                        <span className="gc-tag gc-tag-track">{trackLabel(p.track)}</span>
                        {p.delivery_id && <span className="gc-tag gc-tag-id">{p.delivery_id}</span>}
                        {del?.status && <span className="gc-tag gc-tag-status">{del.status}</span>}
                      </div>
                      <div className="gc-day-item-grid">
                        <Field label="Trainers on day" value={dayTrainers.length || 'Unassigned'} />
                        <Field label="Campus" value={p.campus || del?.campus || '—'} />
                        {del && <Field label="Window" value={`${fmtFullDate(del.start_date)} → ${fmtFullDate(del.end_date)}`} />}
                        {del && (del.filled_slots != null || del.total_slots != null) && (
                          <Field label="Slots filled" value={`${del.filled_slots ?? 0} / ${del.total_slots ?? 0}`} />
                        )}
                        {del?.ta_count != null && <Field label="TAs" value={del.ta_count} />}
                        {del?.risk_level && <Field label="Risk" value={del.risk_level} />}
                      </div>
                      {dayTrainers.length > 0 && (
                        <div className="gc-day-trainers">
                          {dayTrainers.slice(0, 16).map((t, ti) => (
                            <span key={`${t}-${ti}`} className="gc-trainer-chip">{t}</span>
                          ))}
                          {dayTrainers.length > 16 && <span className="gc-trainer-more">+{dayTrainers.length - 16}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="oa-det-contact-row">
      <span className="oa-det-contact-label">{label}</span>
      <span className="oa-det-contact-value">{value}</span>
    </div>
  );
}
