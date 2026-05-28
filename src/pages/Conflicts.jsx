import { useMemo, useState } from 'react';
import { useGetConflictsQuery } from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';

/* ============================================================
   Conflicts — active conflict list with Resolve/Escalate/Defer
   actions, severity + trainer filtering, and live KPI updates.
   ============================================================ */

const crossSkillsMap = [
  { path: 'Java → Python',   desc: '12 trainers cross-certified', percent: 62, barClass: 'mid' },
  { path: 'Cloud → DevOps',  desc: '8 trainers can switch',       percent: 48, barClass: 'warn' },
  { path: 'Testing → Agile', desc: '15 trainers dual-track',      percent: 78, barClass: 'ok' },
  { path: 'React → Node',    desc: '10 full-stack available',      percent: 55, barClass: 'mid' },
];

// Stable unique key for a conflict (used to track handled state)
function conflictKey(c) {
  return `${c.trainer}|${c.date}|${[...(c.delivery_ids || [])].sort().join(',')}`;
}

function mapKpis(summary, liveActive) {
  return [
    {
      label: 'Active Conflicts',
      value: String(liveActive ?? summary.active ?? 0),
      iconType: 'conflict', iconBg: 'rgba(239,68,68,0.12)', iconColor: 'var(--neon-red)',
      iconClass: 'crit', trend: 'Needs immediate action',
    },
    {
      label: 'Resolved (All Time)',
      value: String(summary.resolved ?? 0),
      iconType: 'resolved', iconBg: 'rgba(34,211,165,0.12)', iconColor: 'var(--neon-green)',
      iconClass: 'ok', trend: 'Historical count',
    },
    {
      label: 'Avg Resolution',
      value: String(summary.avg_resolution_hrs ?? '—'),
      unit: summary.avg_resolution_hrs != null ? ' hrs' : '',
      iconType: 'clock', iconBg: 'rgba(6,182,212,0.12)', iconColor: 'var(--cyan)',
      iconClass: '', trend: 'Time to close a conflict',
    },
    {
      label: 'Pending Action',
      value: String(summary.pending_action ?? 0),
      iconType: 'pending', iconBg: 'rgba(245,197,66,0.12)', iconColor: 'var(--neon-yellow)',
      iconClass: 'warn', trend: 'Awaiting manager decision',
    },
    {
      label: 'Auto-Resolved',
      value: String(summary.auto_resolved ?? 0),
      iconType: 'auto', iconBg: 'rgba(168,85,247,0.12)', iconColor: 'var(--neon-purple, #a855f7)',
      iconClass: '', trend: 'By the engine',
    },
  ];
}

function mapConflict(c, idx) {
  const leg1 = c.legs?.[0] || {};
  const leg2 = c.legs?.[1] || {};
  return {
    key:          conflictKey(c),
    id:           idx + 1,
    avatar:       (c.trainer || '??').substring(0, 2).toUpperCase(),
    name:         c.trainer || 'Unknown',
    meta:         `${c.date} · ${c.type === 'double_booked' ? 'Double Booking' : c.type}`,
    severity:     c.severity === 'high' ? 'Critical' : 'Warning',
    severityClass:c.severity === 'high' ? 'crit' : 'warn',
    leftLeg: {
      id:     leg1.delivery_id || c.delivery_ids?.[0] || 'DEL-?',
      name:   leg1.course_name || c.campuses?.[0] || 'Unknown',
      campus: leg1.campus || '',
    },
    rightLeg: {
      id:     leg2.delivery_id || c.delivery_ids?.[1] || 'DEL-?',
      name:   leg2.course_name || c.campuses?.[1] || 'Unknown',
      campus: leg2.campus || '',
    },
    suggestion: c.message || `Assign a replacement trainer for one of the deliveries on ${c.date}`,
    totalLegs:  (c.delivery_ids || []).length,
  };
}

// ---- KPI icon SVGs ------------------------------------------------
function KpiIcon({ type }) {
  switch (type) {
    case 'conflict':
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      );
    case 'resolved':
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'pending':
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
    case 'auto':
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 0 0-15-6.7L3 8" /><path d="M3 4v4h4" />
          <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" /><path d="M21 20v-4h-4" />
        </svg>
      );
    default: return null;
  }
}

// ---- Single conflict card -----------------------------------------
function ConflictCard({ conf, onAction }) {
  return (
    <div className={`conflict-card ${conf.severityClass === 'warn' ? 'warn' : ''}`}>
      <div className="cc-head">
        <div className="cc-trainer">
          <div className="cc-avatar conf">{conf.avatar}</div>
          <div>
            <div className="cc-name">{conf.name}</div>
            <div className="cc-name-meta">{conf.meta}</div>
          </div>
        </div>
        <span className={`cc-severity ${conf.severityClass}`}>
          <span className="dot" />
          {conf.severity}
        </span>
      </div>

      <div className="cc-versus">
        <div className="cc-leg">
          <div className="cc-leg-id">{conf.leftLeg.id}</div>
          <div className="cc-leg-name">{conf.leftLeg.name}</div>
          {conf.leftLeg.campus && (
            <div className="cc-leg-meta"><span>{conf.leftLeg.campus}</span></div>
          )}
          <div className="cc-leg-meta"><span>Delivery 1</span></div>
        </div>
        <div className="cc-vs-icon">
          {conf.totalLegs > 2 ? `+${conf.totalLegs - 1}` : 'VS'}
        </div>
        <div className="cc-leg">
          <div className="cc-leg-id">{conf.rightLeg.id}</div>
          <div className="cc-leg-name">{conf.rightLeg.name}</div>
          {conf.rightLeg.campus && (
            <div className="cc-leg-meta"><span>{conf.rightLeg.campus}</span></div>
          )}
          <div className="cc-leg-meta"><span>Delivery 2</span></div>
        </div>
      </div>

      <div className="cc-resolve">
        <div className="cc-resolve-text">
          <strong>Suggestion:</strong> {conf.suggestion}
        </div>
        <div className="cc-actions">
          <button className="cc-btn primary" onClick={() => onAction(conf.key, 'Resolve')}>
            RESOLVE
          </button>
          <button className="cc-btn" onClick={() => onAction(conf.key, 'Escalate')}>
            ESCALATE
          </button>
          <button className="cc-btn" onClick={() => onAction(conf.key, 'Defer')}>
            DEFER
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main page ----------------------------------------------------
export default function Conflicts({ active }) {
  const { data, error, refetch } = useGetConflictsQuery();

  // Local action state — persists for the lifetime of this page view
  const [handled, setHandled] = useState(() => new Map()); // key → {action, time, status, statusClass}
  const [filterSeverity, setFilterSeverity] = useState('ALL');  // 'ALL' | 'CRITICAL' | 'WARNING'
  const [filterSearch, setFilterSearch] = useState('');

  const rawConflicts = useMemo(() => (data?.conflicts ?? []).map(mapConflict), [data]);
  const proneDays    = data?.conflict_prone_days ?? [];

  // ---- Derived counts from local action state --------------------
  const resolvedCount  = useMemo(() => [...handled.values()].filter(h => h.action === 'Resolve').length,  [handled]);
  const escalatedCount = useMemo(() => [...handled.values()].filter(h => h.action === 'Escalate').length, [handled]);
  const deferredCount  = useMemo(() => [...handled.values()].filter(h => h.action === 'Defer').length,    [handled]);
  const liveActive     = Math.max(0, (data?.total_conflicts ?? 0) - handled.size);

  // ---- Live KPIs (fold local actions into backend summary) -------
  const kpis = useMemo(() => {
    if (!data?.kpi_summary) return null;
    const base = data.kpi_summary;
    return mapKpis(
      {
        ...base,
        resolved:       (base.resolved      || 0) + resolvedCount,
        pending_action: Math.max(0, (base.pending_action || 0) - resolvedCount) + escalatedCount + deferredCount,
      },
      liveActive,
    );
  }, [data, resolvedCount, escalatedCount, deferredCount, liveActive]);

  // ---- Resolution log (local actions + any backend history) ------
  const resolutionLog = useMemo(() => {
    const localEntries = [...handled.entries()].reverse().map(([key, info]) => {
      const trainer = key.split('|')[0] || '';
      const date    = key.split('|')[1] || '';
      const labelMap = { Resolve: 'RESOLVED', Escalate: 'ESCALATED', Defer: 'DEFERRED' };
      const classMap = { Resolve: 'ok', Escalate: 'warn', Defer: 'info' };
      return {
        time:        info.time,
        status:      labelMap[info.action] || info.action.toUpperCase(),
        statusClass: classMap[info.action] || 'info',
        message:     `${trainer} on ${date}`,
      };
    });
    const backendEntries = (data?.resolution_log ?? []).map(log => ({
      time:        log.time || log.timestamp || '',
      status:      log.status || '',
      statusClass: log.statusClass || 'info',
      message:     log.message || log.text || '',
    }));
    return [...localEntries, ...backendEntries];
  }, [handled, data]);

  // ---- Filtered conflict list ------------------------------------
  const visibleConflicts = useMemo(() => {
    return rawConflicts.filter(conf => {
      if (handled.has(conf.key)) return false;
      if (filterSeverity === 'CRITICAL' && conf.severity !== 'Critical') return false;
      if (filterSeverity === 'WARNING'  && conf.severity !== 'Warning')  return false;
      if (filterSearch.trim()) {
        const needle = filterSearch.trim().toLowerCase();
        if (!conf.name.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [rawConflicts, handled, filterSeverity, filterSearch]);

  // ---- Action handler -------------------------------------------
  const handleAction = (key, action) => {
    const now     = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setHandled(prev => {
      const next = new Map(prev);
      next.set(key, { action, time: timeStr });
      return next;
    });
  };

  if (error) return <ErrorPanel panelId="conflicts" active={active} error={error?.error || error?.message || 'Unknown error'} onRetry={() => refetch()} />;
  if (!data || !kpis) return <LoadingPanel panelId="conflicts" active={active} />;

  const criticalCount = visibleConflicts.filter(c => c.severity === 'Critical').length;
  const warningCount  = visibleConflicts.filter(c => c.severity === 'Warning').length;

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="conflicts">

      {/* KPI strip */}
      <div className="kpi-strip">
        {kpis.map((kpi, idx) => (
          <div className="kpi" key={idx}>
            <div className="kpi-icon" style={{ background: kpi.iconBg, color: kpi.iconColor }}>
              <KpiIcon type={kpi.iconType} />
            </div>
            <div className="kpi-body">
              <div className="kpi-label">{kpi.label}</div>
              <div className={`kpi-value ${kpi.iconClass}`}>
                {kpi.value}
                {kpi.unit && <span className="unit">{kpi.unit}</span>}
              </div>
              <div className="kpi-trend">{kpi.trend}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="conflict-grid">

        {/* ---- Left: Conflict list ---- */}
        <div>
          {/* Header row */}
          <div className="cf-list-head">
            <div className="cf-list-title">Active Conflicts · Sorted By Severity</div>
            <div className="cf-filter-row">
              <button
                className={`chip ${filterSeverity === 'ALL' ? 'cf-chip-active neutral' : 'neutral'}`}
                onClick={() => setFilterSeverity('ALL')}
              >
                ALL · {liveActive}
              </button>
              <button
                className={`chip ${filterSeverity === 'CRITICAL' ? 'cf-chip-active error' : 'error'}`}
                onClick={() => setFilterSeverity(s => s === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
              >
                <span className="chip-dot" />CRITICAL · {criticalCount}
              </button>
              <button
                className={`chip ${filterSeverity === 'WARNING' ? 'cf-chip-active warn' : 'warn'}`}
                onClick={() => setFilterSeverity(s => s === 'WARNING' ? 'ALL' : 'WARNING')}
              >
                <span className="chip-dot" />WARNING · {warningCount}
              </button>

              {/* Trainer search */}
              <div className="cf-search-wrap">
                <svg className="cf-search-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  className="cf-search-input"
                  type="text"
                  placeholder="Search trainer…"
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                />
                {filterSearch && (
                  <button className="cf-search-clear" onClick={() => setFilterSearch('')} aria-label="Clear">×</button>
                )}
              </div>
            </div>
          </div>

          {/* Conflict cards */}
          {visibleConflicts.length === 0 ? (
            <div className="cf-empty">
              {handled.size > 0
                ? `All ${handled.size} conflict${handled.size !== 1 ? 's' : ''} handled this session. Great work!`
                : 'No active conflicts detected.'}
            </div>
          ) : (
            visibleConflicts.map(conf => (
              <ConflictCard key={conf.key} conf={conf} onAction={handleAction} />
            ))
          )}

          {/* Handled note */}
          {handled.size > 0 && visibleConflicts.length > 0 && (
            <div className="cf-handled-note">
              {handled.size} conflict{handled.size !== 1 ? 's' : ''} handled this session ·&nbsp;
              <button className="cf-undo-link" onClick={() => setHandled(new Map())}>Undo all</button>
            </div>
          )}
        </div>

        {/* ---- Right: Aside panels ---- */}
        <div className="conflict-aside">

          {/* Conflict-prone days */}
          <div className="conf-mini-card">
            <div className="cmh-title">Conflict-Prone Days · Next 30</div>
            <div className="confdays-list">
              {proneDays.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '8px 0' }}>
                  No high-risk days detected.
                </div>
              ) : proneDays.map((cDay, idx) => (
                <div className={`confday-row ${cDay.severity}`} key={idx}>
                  <span className="d">{cDay.day}</span>
                  <span className="lab">{cDay.desc}</span>
                  <span className="v">{cDay.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution log */}
          <div className="conf-mini-card">
            <div className="cmh-title">
              Resolution Log · Last 48 Hrs
              {resolutionLog.length > 0 && (
                <span className="cf-log-badge">{resolutionLog.length}</span>
              )}
            </div>
            <div className="timeline-log">
              {resolutionLog.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '8px 0' }}>
                  No resolution history yet.
                </div>
              ) : resolutionLog.map((log, idx) => (
                <div className="tl-row" key={idx}>
                  <span className="ts">{log.time}</span>
                  <span className="msg">
                    <span className={`tag ${log.statusClass}`}>{log.status}</span>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cross-skill map */}
          <div className="conf-mini-card">
            <div className="cmh-title">Cross-Skill Quick Map</div>
            <div className="lanes-row">
              {crossSkillsMap.map((lane, idx) => (
                <div className="lane" key={idx}>
                  <div className="lane-name">
                    {lane.path.split(' → ')[0]} → {lane.path.split(' → ')[1]}
                    <small>{lane.desc}</small>
                  </div>
                  <div className={`lane-bar ${lane.barClass}`}>
                    <i style={{ width: `${lane.percent}%` }} />
                  </div>
                  <div className={`lane-val ${lane.barClass}`}>{lane.percent}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
