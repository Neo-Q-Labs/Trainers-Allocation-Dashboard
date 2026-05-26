import { useState, useEffect, useMemo } from 'react';
import { useGetDateBlockingQuery, useGetAvailabilityForDateQuery } from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';
import DatePicker from '../components/DatePicker.jsx';

/* ============================================================
   Trainer Capacity Planner — Overview
   ------------------------------------------------------------
   Re-built from scratch around the only data flow we trust:
   GET /api/v1/date-blocking, which pivots Trainer Data Live
   per (trainer × date). Every number on this page comes from
   the same call so the story stays internally consistent.
   ============================================================ */

const CATEGORY_ORDER = ['FT', 'SME', 'WILP', 'FREELANCER'];

const TYPE_COLOR = {
  FT: 'var(--neon-red)',
  SME: 'var(--neon-purple)',
  WILP: 'var(--wilp)',
  FREELANCER: 'var(--neon-yellow)',
};

const TYPE_BLURB = {
  FT: 'Internal full-time',
  SME: 'Internal SMEs',
  WILP: 'Internal WILP',
  FREELANCER: 'Freelancers',
};

const toIso = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

// Monday-based start of the calendar week containing `d`.
const startOfWeek = (d) => {
  const r = new Date(d);
  const wd = (r.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  r.setDate(r.getDate() - wd);
  return r;
};
const endOfWeek = (d) => addDays(startOfWeek(d), 6);

const fmtShort = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const navigateTo = (panel) => window.qlabs?.switchPanel?.(panel);

// ---------------------------------------------------------------------------
// Date-Range Filter (Start / End + Apply / Reset)
// ---------------------------------------------------------------------------
function DateFilter({
  pendingStart, pendingEnd,
  committedStart, committedEnd,
  defaultStart, defaultEnd,
  quickRanges = [], activeChipId, onChip,
  onChangeStart, onChangeEnd,
  onApply, onReset,
  loading,
}) {
  const hasPending = pendingStart !== committedStart || pendingEnd !== committedEnd;
  const isDefault = committedStart === defaultStart && committedEnd === defaultEnd;
  const invalid = !!pendingEnd && !!pendingStart && pendingEnd < pendingStart;
  const rangeDays = (committedStart && committedEnd)
    ? Math.max(0, Math.round((new Date(committedEnd) - new Date(committedStart)) / 864e5)) + 1
    : 0;

  return (
    <div className="ov-filter">
      <span className="ov-filter-title">Date range</span>

      <DatePicker
        value={pendingStart}
        onChange={onChangeStart}
        max={pendingEnd}
        ariaLabel="Start date"
      />
      <span className="ov-filter-arrow" aria-hidden="true">→</span>
      <DatePicker
        value={pendingEnd}
        onChange={onChangeEnd}
        min={pendingStart}
        ariaLabel="End date"
      />

      <div className="ov-chip-row" role="group" aria-label="Quick date ranges">
        {quickRanges.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`ov-chip${activeChipId === c.id ? ' is-active' : ''}`}
            onClick={() => onChip && onChip(c)}
            disabled={loading}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="ov-filter-meta">
        {invalid ? (
          <span className="ov-filter-err">End must be on/after start</span>
        ) : (
          <span className="ov-filter-window">{rangeDays}d</span>
        )}
      </div>

      <div className="ov-filter-spacer" />

      <button
        type="button"
        className="ov-filter-reset"
        onClick={onReset}
        disabled={loading || isDefault}
        title="Reset to current week"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        Reset
      </button>
      <button
        type="button"
        className="ov-filter-apply"
        onClick={onApply}
        disabled={loading || invalid || !hasPending}
      >
        {loading ? 'Loading…' : 'Apply'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Today's Capacity Snapshot
// ---------------------------------------------------------------------------
function SnapshotStrip({ todayDay, rosterByType }) {
  if (!todayDay) return null;
  return (
    <div className="ov-snapshot">
      <div className="ov-section-head">
        <div className="ov-section-title">
          <span className="ov-section-dot" />
          Today&apos;s capacity
        </div>
        <div className="ov-section-sub">{todayDay.label} · from Trainer Data Live</div>
      </div>
      <div className="ov-snapshot-grid">
        {CATEGORY_ORDER.map((c) => {
          const roster = rosterByType[c] || 0;
          // OCCUPIED = any-role busy of this type (trainer + TA + backup).
          // FREE = trainers with cell "Not alloted" (matches Availability list).
          const free = (todayDay.available_by_type && todayDay.available_by_type[c] != null)
            ? todayDay.available_by_type[c]
            : Math.max(0, roster - (todayDay.deployed_by_type?.[c] || 0));
          const busy = Math.max(0, roster - free);
          const pct = roster > 0 ? Math.min(100, (busy / roster) * 100) : 0;
          return (
            <button
              key={c}
              className="ov-cat-card"
              style={{ '--cat-color': TYPE_COLOR[c] }}
              onClick={() => navigateTo('requirements')}
              title="Open Date-Wise Blocking"
            >
              <div className="ov-cat-head">
                <span className="ov-cat-name">{c}</span>
                <span className="ov-cat-sub">{TYPE_BLURB[c]}</span>
              </div>
              <div className="ov-cat-stats">
                <div className="ov-cat-busy">
                  <div className="ov-cat-num">{busy}</div>
                  <div className="ov-cat-label">OCCUPIED</div>
                </div>
                <div className="ov-cat-divider" />
                <div className="ov-cat-free">
                  <div className="ov-cat-num">{free}</div>
                  <div className="ov-cat-label">FREE</div>
                </div>
              </div>
              <div className="ov-cat-bar" aria-hidden="true">
                <div className="ov-cat-bar-fill" style={{ width: `${pct.toFixed(1)}%` }} />
              </div>
              <div className="ov-cat-foot">
                <span>{pct.toFixed(0)}% utilized</span>
                <span>of {roster}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Availability Resource — collapsible dropdown listing free trainers per date
// ---------------------------------------------------------------------------
function AvailabilityResource({ days }) {
  // Internal categories first, then Freelancer. Order matters.
  const RES_ORDER = ['FT', 'SME', 'WILP', 'FREELANCER'];

  const [open, setOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState(days[0]?.date || '');

  // If the filter range changes and the previously selected date is gone, reset.
  useEffect(() => {
    if (days.length === 0) return;
    if (!days.find((d) => d.date === selectedDate)) {
      setSelectedDate(days[0].date);
    }
  }, [days, selectedDate]);

  // Read availability for the selected date from the Redux store. The Sync
  // button invalidates these per-date payloads so all dates get fresh data.
  const {
    data: liveData,
    isFetching: loading,
    error: fetchError,
  } = useGetAvailabilityForDateQuery(selectedDate, { skip: !selectedDate });

  // Prefer the freshly-fetched payload; fall back to the per-day data already
  // in memory so the section never goes blank between fetches.
  const fallbackDay = days.find((d) => d.date === selectedDate) || days[0] || null;
  const source = liveData && liveData.date === selectedDate ? liveData : null;
  const list = source ? (source.available || []) : (fallbackDay?.available || []);

  // Group + sort: internal pools first, freelancers last; each list A→Z.
  const grouped = useMemo(() => {
    const g = { FT: [], SME: [], WILP: [], FREELANCER: [] };
    list.forEach((p) => {
      if (g[p.type]) g[p.type].push(p);
    });
    Object.keys(g).forEach((k) => g[k].sort((a, b) => a.name.localeCompare(b.name)));
    return g;
  }, [list]);

  const totals = RES_ORDER.map((c) => ({ c, n: grouped[c].length }));
  const grandTotal = list.length;
  const syncedAt = source?.synced_at;

  return (
    <div className="ov-card ov-avail">
      <button
        type="button"
        className="ov-avail-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="ov-section-title">
          <span className="ov-section-dot" />
          Availability Resource
        </div>
        <div className="ov-avail-head-right">
          <span className="ov-avail-total">{grandTotal} free</span>
          {totals.map(({ c, n }) => (
            <span
              key={c}
              className="ov-avail-pill"
              style={{ '--cat-color': TYPE_COLOR[c] }}
              title={`${n} ${c}`}
            >
              <span className="dot" />{n}
              <span className="lbl">{c}</span>
            </span>
          ))}
          <svg
            viewBox="0 0 24 24" width="14" height="14"
            fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`ov-avail-caret${open ? ' is-open' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="ov-avail-body">
          <div className="ov-avail-controls">
            <label className="ov-avail-date-field">
              <span className="ov-avail-date-label">For date</span>
              <select
                className="ov-avail-date-select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={loading}
              >
                {days.map((d) => (
                  <option key={d.date} value={d.date}>
                    {d.label} — {(d.available || []).length} free
                  </option>
                ))}
              </select>
              {loading && <span className="ov-avail-spinner" aria-label="Loading" />}
            </label>
            <div className="ov-avail-helper">
              {fetchError ? (
                <span style={{ color: 'var(--neon-red)' }}>
                  {fetchError?.error || fetchError?.message || 'Failed to load availability'}
                </span>
              ) : (
                <>
                  Live from <strong style={{ color: 'var(--text-secondary)' }}>Trainer Data Live</strong>
                  {syncedAt && (
                    <> · synced {new Date(syncedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</>
                  )}
                  {' '}· Internal first, Freelancers last
                </>
              )}
            </div>
          </div>

          {grandTotal === 0 ? (
            <div className="ov-empty">{loading ? 'Loading availability…' : 'No trainers free on this date.'}</div>
          ) : (
            <div className="ov-avail-groups">
              {RES_ORDER.map((c) => {
                const arr = grouped[c];
                if (arr.length === 0) return null;
                return (
                  <div key={c} className="ov-avail-group">
                    <div
                      className="ov-avail-group-head"
                      style={{ '--cat-color': TYPE_COLOR[c] }}
                    >
                      <span className="dot" />
                      <span className="name">{c}</span>
                      <span className="sub">{c === 'FREELANCER' ? 'External pool' : 'Internal pool'}</span>
                      <span className="count">{arr.length}</span>
                    </div>
                    <div className="ov-avail-list">
                      {arr.map((p) => (
                        <div key={`${c}-${p.name}`} className="ov-avail-row">
                          <span
                            className="ov-avail-initial"
                            style={{ background: TYPE_COLOR[c] }}
                          >
                            {(p.name || '?').trim().charAt(0).toUpperCase()}
                          </span>
                          <div className="ov-avail-meta">
                            <div className="ov-avail-name">{p.name}</div>
                            <div className="ov-avail-sub">
                              {p.type_raw || c}
                              {p.vendor && p.vendor !== 'NA' && (
                                <>
                                  <span className="dot-sep">·</span>
                                  <span className="vendor">{p.vendor}</span>
                                </>
                              )}
                              {p.employee_id && (
                                <>
                                  <span className="dot-sep">·</span>
                                  <span className="empid">{p.employee_id}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span
                            className="ov-avail-chip"
                            style={{ '--cat-color': TYPE_COLOR[c] }}
                          >
                            {c}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 30-Day Outlook bar chart (occupied vs free, stacked per day)
// ---------------------------------------------------------------------------
function OutlookChart({ days, rosterByType }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const rosterTotal = useMemo(
    () => CATEGORY_ORDER.reduce((s, c) => s + (rosterByType[c] || 0), 0),
    [rosterByType]
  );

  if (!days || days.length === 0) return null;

  const CHART_W = 980;
  const CHART_H = 220;
  const PAD_L = 36;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 28;
  const innerW = CHART_W - PAD_L - PAD_R;
  const innerH = CHART_H - PAD_T - PAD_B;
  const barGap = 3;
  const barW = Math.max(4, (innerW - barGap * (days.length - 1)) / days.length);

  const max = rosterTotal || 1;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    v: Math.round(max * p),
    y: PAD_T + innerH - innerH * p,
  }));

  const hoveredDay = hoverIdx != null ? days[hoverIdx] : null;
  // Helper: free count for a day uses the backend's available_total (length of
  // available[]) so the chart agrees with the Availability Resource header.
  const freeOf = (d) =>
    d.available_total != null
      ? d.available_total
      : Math.max(0, rosterTotal - (d.deployed || 0) - (d.tas || 0) - (d.backups || 0));

  const tightestDay = useMemo(() => {
    let worst = null;
    days.forEach((d) => {
      const free = freeOf(d);
      if (!worst || free < worst.free) worst = { day: d, free };
    });
    return worst;
  }, [days, rosterTotal]);

  return (
    <div className="ov-card ov-outlook">
      <div className="ov-section-head">
        <div className="ov-section-title">
          <span className="ov-section-dot" />
          {days.length}-day capacity outlook
        </div>
        <div className="ov-section-sub">
          {fmtShort(days[0].date)} → {fmtShort(days[days.length - 1].date)} · click any bar to plan
        </div>
      </div>

      <div className="ov-outlook-legend">
        <span className="ov-legend"><span className="dot" style={{ background: 'var(--neon-red)' }} />Occupied trainers</span>
        <span className="ov-legend"><span className="dot" style={{ background: 'var(--neon-purple)' }} />Occupied TAs</span>
        <span className="ov-legend"><span className="dot" style={{ background: 'var(--neon-orange)' }} />Backups</span>
        <span className="ov-legend"><span className="dot" style={{ background: 'rgba(34,211,165,0.4)' }} />Free</span>
        {tightestDay && (
          <span className="ov-legend ov-tightest">
            Tightest day: <strong>{fmtShort(tightestDay.day.date)}</strong> ({tightestDay.free} free)
          </span>
        )}
      </div>

      <div className="ov-outlook-wrap">
        <svg
          className="ov-outlook-svg"
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="none"
        >
          {/* Y-axis grid lines */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={PAD_L}
                x2={CHART_W - PAD_R}
                y1={t.y}
                y2={t.y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="2 4"
              />
              <text
                x={PAD_L - 6}
                y={t.y + 3}
                textAnchor="end"
                fill="var(--text-muted)"
                fontSize="9"
                fontFamily="var(--mono)"
              >
                {t.v}
              </text>
            </g>
          ))}

          {/* Bars */}
          {days.map((d, i) => {
            const busy = d.deployed || 0;
            const tas = d.tas || 0;
            const backups = d.backups || 0;
            const free = freeOf(d);
            const total = rosterTotal;
            const x = PAD_L + i * (barW + barGap);
            const hBusy = (busy / total) * innerH;
            const hTas = (tas / total) * innerH;
            const hBackup = (backups / total) * innerH;
            const hFree = (free / total) * innerH;
            const isToday = i === 0;
            return (
              <g
                key={d.date}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                onClick={() => navigateTo('requirements')}
                style={{ cursor: 'pointer' }}
              >
                {/* free (top) */}
                <rect
                  x={x}
                  y={PAD_T}
                  width={barW}
                  height={hFree}
                  fill="rgba(34,211,165,0.35)"
                  opacity={hoverIdx == null || hoverIdx === i ? 1 : 0.4}
                />
                {/* TAs */}
                <rect
                  x={x}
                  y={PAD_T + hFree}
                  width={barW}
                  height={hTas}
                  fill="var(--neon-purple)"
                  opacity={hoverIdx == null || hoverIdx === i ? 1 : 0.4}
                />
                {/* Backups */}
                <rect
                  x={x}
                  y={PAD_T + hFree + hTas}
                  width={barW}
                  height={hBackup}
                  fill="var(--neon-orange)"
                  opacity={hoverIdx == null || hoverIdx === i ? 1 : 0.4}
                />
                {/* occupied trainers (bottom) */}
                <rect
                  x={x}
                  y={PAD_T + hFree + hTas + hBackup}
                  width={barW}
                  height={hBusy}
                  fill="var(--neon-red)"
                  opacity={hoverIdx == null || hoverIdx === i ? 1 : 0.4}
                />
                {isToday && (
                  <rect
                    x={x - 1}
                    y={PAD_T - 2}
                    width={barW + 2}
                    height={innerH + 4}
                    fill="none"
                    stroke="var(--neon-green)"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                  />
                )}
              </g>
            );
          })}

          {/* X-axis labels — show every 5th */}
          {days.map((d, i) => {
            if (i % 5 !== 0 && i !== days.length - 1) return null;
            const x = PAD_L + i * (barW + barGap) + barW / 2;
            return (
              <text
                key={`l-${d.date}`}
                x={x}
                y={CHART_H - 8}
                textAnchor="middle"
                fill="var(--text-muted)"
                fontSize="9"
                fontFamily="var(--mono)"
              >
                {fmtShort(d.date)}
              </text>
            );
          })}
        </svg>

        {hoveredDay && (
          <div
            className="ov-outlook-tip"
            style={{
              left: `${((PAD_L + hoverIdx * (barW + barGap) + barW / 2) / CHART_W) * 100}%`,
            }}
          >
            <div className="ov-tip-date">{hoveredDay.label}</div>
            <div className="ov-tip-row"><span style={{ color: 'var(--neon-red)' }}>●</span> {hoveredDay.deployed} trainers</div>
            <div className="ov-tip-row"><span style={{ color: 'var(--neon-purple)' }}>●</span> {hoveredDay.tas} TAs</div>
            {(hoveredDay.backups || 0) > 0 && (
              <div className="ov-tip-row"><span style={{ color: 'var(--neon-orange)' }}>●</span> {hoveredDay.backups} backups</div>
            )}
            <div className="ov-tip-row"><span style={{ color: 'var(--neon-green)' }}>●</span> {freeOf(hoveredDay)} free</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top Active Clients (aggregated from occupied[].client across the range)
// ---------------------------------------------------------------------------
function TopClients({ days }) {
  const clients = useMemo(() => {
    const byClient = new Map(); // client → { trainerDays, distinctTrainers, distinctDeliveries }
    days.forEach((d) => {
      (d.occupied || []).forEach((p) => {
        const c = (p.client || '').trim() || 'Unspecified';
        if (!byClient.has(c)) {
          byClient.set(c, {
            client: c,
            trainerDays: 0,
            distinctTrainers: new Set(),
            distinctCells: new Set(),
          });
        }
        const e = byClient.get(c);
        e.trainerDays += 1;
        if (p.name) e.distinctTrainers.add(p.name);
        if (p.cell) e.distinctCells.add(p.cell);
      });
    });
    return Array.from(byClient.values())
      .map((e) => ({
        client: e.client,
        trainerDays: e.trainerDays,
        distinctTrainers: e.distinctTrainers.size,
        distinctEngagements: e.distinctCells.size,
      }))
      .sort((a, b) => b.trainerDays - a.trainerDays)
      .slice(0, 8);
  }, [days]);

  const max = clients[0]?.trainerDays || 1;

  if (clients.length === 0) {
    return (
      <div className="ov-card">
        <div className="ov-section-head">
          <div className="ov-section-title">
            <span className="ov-section-dot" />
            Top active clients
          </div>
        </div>
        <div className="ov-empty">No client engagements in this window.</div>
      </div>
    );
  }

  return (
    <div className="ov-card">
      <div className="ov-section-head">
        <div className="ov-section-title">
          <span className="ov-section-dot" />
          Top active clients
        </div>
        <div className="ov-section-sub">By trainer-days committed across the window</div>
      </div>
      <div className="ov-clients">
        {clients.map((c, i) => (
          <button
            key={c.client}
            className="ov-client-row"
            onClick={() => navigateTo('clients')}
            title="Open Client Directory"
          >
            <span className="ov-client-rank">#{i + 1}</span>
            <span className="ov-client-name">{c.client}</span>
            <div className="ov-client-bar">
              <div
                className="ov-client-bar-fill"
                style={{ width: `${(c.trainerDays / max) * 100}%` }}
              />
            </div>
            <span className="ov-client-meta">
              <strong>{c.trainerDays}</strong> trainer-days · {c.distinctTrainers} trainers · {c.distinctEngagements} engagements
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Roster Composition donut
// ---------------------------------------------------------------------------
function RosterDonut({ rosterByType }) {
  const total = CATEGORY_ORDER.reduce((s, c) => s + (rosterByType[c] || 0), 0);
  if (total === 0) return null;

  const R = 56;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = CATEGORY_ORDER.map((c) => {
    const v = rosterByType[c] || 0;
    const frac = v / total;
    const arc = { c, v, len: C * frac, off: offset };
    offset += arc.len;
    return arc;
  });

  return (
    <div className="ov-card ov-donut-card">
      <div className="ov-section-head">
        <div className="ov-section-title">
          <span className="ov-section-dot" />
          Roster composition
        </div>
        <div className="ov-section-sub">From Trainer Data Live · Internal-Exit excluded</div>
      </div>
      <div className="ov-donut-body">
        <svg viewBox="0 0 140 140" className="ov-donut-svg">
          <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16" />
          {arcs.map((a) => (
            <circle
              key={a.c}
              cx="70" cy="70" r={R}
              fill="none"
              stroke={TYPE_COLOR[a.c]}
              strokeWidth="16"
              strokeDasharray={`${a.len} ${C - a.len}`}
              strokeDashoffset={-a.off}
              transform="rotate(-90 70 70)"
              style={{ filter: `drop-shadow(0 0 4px ${TYPE_COLOR[a.c]})` }}
            />
          ))}
          <text x="70" y="68" textAnchor="middle" fill="var(--text-primary)" fontSize="24" fontWeight="700" fontFamily="var(--mono)">
            {total}
          </text>
          <text x="70" y="86" textAnchor="middle" fill="var(--text-muted)" fontSize="9" letterSpacing="2">
            ACTIVE
          </text>
        </svg>
        <div className="ov-donut-legend">
          {arcs.map((a) => {
            const pct = ((a.v / total) * 100).toFixed(0);
            return (
              <div key={a.c} className="ov-donut-row" style={{ '--cat-color': TYPE_COLOR[a.c] }}>
                <span className="ov-donut-swatch" />
                <span className="ov-donut-name">{a.c}</span>
                <span className="ov-donut-count">{a.v}</span>
                <span className="ov-donut-pct">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Actions
// ---------------------------------------------------------------------------
function QuickActions({ todayDay, rosterByType }) {
  const totalRoster = CATEGORY_ORDER.reduce((s, c) => s + (rosterByType[c] || 0), 0);
  // Truly-free count = trainers with cell "Not alloted" (aligned with Availability list)
  const free = todayDay?.available_total != null
    ? todayDay.available_total
    : Math.max(0, totalRoster - (todayDay?.deployed || 0) - (todayDay?.tas || 0) - (todayDay?.backups || 0));

  const actions = [
    {
      target: 'requirements',
      title: 'Plan a new requirement',
      sub: `${free} trainer${free === 1 ? '' : 's'} free today — check the date-wise grid before reaching out to freelancers.`,
      cta: 'Open Date-Wise Blocking',
      tone: 'primary',
    },
    {
      target: 'calendar',
      title: 'View deliveries on the calendar',
      sub: 'See active programmes laid out per day across the planning horizon.',
      cta: 'Open Calendar',
      tone: 'ghost',
    },
    {
      target: 'trainers',
      title: 'Browse the trainer roster',
      sub: `${totalRoster} active trainers across FT / SME / WILP / Freelancer pools.`,
      cta: 'Open Trainer Roster',
      tone: 'ghost',
    },
  ];

  return (
    <div className="ov-card ov-actions-card">
      <div className="ov-section-head">
        <div className="ov-section-title">
          <span className="ov-section-dot" />
          Where to go next
        </div>
      </div>
      <div className="ov-actions">
        {actions.map((a) => (
          <button
            key={a.target}
            className={`ov-action ov-action-${a.tone}`}
            onClick={() => navigateTo(a.target)}
          >
            <div className="ov-action-text">
              <div className="ov-action-title">{a.title}</div>
              <div className="ov-action-sub">{a.sub}</div>
            </div>
            <span className="ov-action-cta">
              {a.cta}
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------
export default function Overview({ active }) {
  const today = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => toIso(startOfWeek(today)), [today]);
  const defaultEnd = useMemo(() => toIso(endOfWeek(today)), [today]);

  // Quick-range presets — clicking a chip applies immediately.
  const quickRanges = useMemo(() => {
    const t = today;
    const monthStart = new Date(t.getFullYear(), t.getMonth(), 1);
    const monthEnd = new Date(t.getFullYear(), t.getMonth() + 1, 0);
    return [
      { id: 'today', label: 'Today', start: toIso(t), end: toIso(t) },
      { id: 'week', label: 'This Week', start: toIso(startOfWeek(t)), end: toIso(endOfWeek(t)) },
      { id: 'next14', label: 'Next 14 Days', start: toIso(t), end: toIso(addDays(t, 13)) },
      { id: 'month', label: 'This Month', start: toIso(monthStart), end: toIso(monthEnd) },
    ];
  }, [today]);

  // "committed" = the range currently driving the data fetch
  // "pending"   = what's typed into the date inputs (only takes effect on Apply)
  const [committedStart, setCommittedStart] = useState(defaultStart);
  const [committedEnd, setCommittedEnd] = useState(defaultEnd);
  const [pendingStart, setPendingStart] = useState(defaultStart);
  const [pendingEnd, setPendingEnd] = useState(defaultEnd);

  const activeChipId = useMemo(() => {
    const m = quickRanges.find((c) => c.start === committedStart && c.end === committedEnd);
    return m ? m.id : null;
  }, [quickRanges, committedStart, committedEnd]);

  // Read date-blocking from the Redux store — cached across navigations and
  // refreshed by the global Sync button in the Topbar.
  const {
    data,
    error,
    isFetching: loading,
    refetch,
  } = useGetDateBlockingQuery(
    { start_date: committedStart, end_date: committedEnd },
    { skip: !committedStart || !committedEnd },
  );

  const applyRange = () => {
    if (pendingEnd < pendingStart) return;
    setCommittedStart(pendingStart);
    setCommittedEnd(pendingEnd);
  };

  const resetRange = () => {
    setPendingStart(defaultStart);
    setPendingEnd(defaultEnd);
    setCommittedStart(defaultStart);
    setCommittedEnd(defaultEnd);
  };

  const applyChip = (chip) => {
    setPendingStart(chip.start);
    setPendingEnd(chip.end);
    setCommittedStart(chip.start);
    setCommittedEnd(chip.end);
  };

  if (error) return <ErrorPanel panelId="overview" active={active} error={error?.error || error?.message || 'Failed to load capacity data.'} onRetry={() => refetch()} />;
  if (!data) return <LoadingPanel panelId="overview" active={active} />;

  const summary = data.summary || { roster_by_type: {} };
  const days = data.days || [];
  const todayDay = days[0] || null;
  const rosterByType = summary.roster_by_type || {};

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="overview">
      <div className="callout" style={{ marginBottom: '16px' }}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <div className="callout-title">Live capacity at a glance</div>
        <div className="callout-body">
          Every number on this page is pulled from the <strong style={{ color: 'var(--text-primary)' }}>Trainer Data Live</strong> sheet via the same Date-Wise Blocking pivot.
          What you see is exactly what the planning grid sees — no derived KPIs or mock figures.
        </div>
      </div>

      <DateFilter
        pendingStart={pendingStart}
        pendingEnd={pendingEnd}
        committedStart={committedStart}
        committedEnd={committedEnd}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
        quickRanges={quickRanges}
        activeChipId={activeChipId}
        onChip={applyChip}
        onChangeStart={setPendingStart}
        onChangeEnd={setPendingEnd}
        onApply={applyRange}
        onReset={resetRange}
        loading={loading}
      />

      <SnapshotStrip todayDay={todayDay} rosterByType={rosterByType} />

      <AvailabilityResource days={days} />

      <OutlookChart days={days} rosterByType={rosterByType} />

      <div className="ov-grid-2">
        <TopClients days={days} />
        <RosterDonut rosterByType={rosterByType} />
      </div>

      <QuickActions todayDay={todayDay} rosterByType={rosterByType} />
    </section>
  );
}
