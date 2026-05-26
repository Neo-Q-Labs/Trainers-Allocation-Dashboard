import { useMemo } from 'react';
import { useGetConflictsQuery } from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';

/**
 * crossSkillsMap is kept static — the Excel data doesn't contain a skill
 * compatibility matrix. This can be replaced once a skill-mapping layer exists.
 */
const crossSkillsMap = [
  { path: 'Java → Python', desc: '12 trainers cross-certified', percent: 62, barClass: 'mid' },
  { path: 'Cloud → DevOps', desc: '8 trainers can switch', percent: 48, barClass: 'warn' },
  { path: 'Testing → Agile', desc: '15 trainers dual-track', percent: 78, barClass: 'ok' },
  { path: 'React → Node', desc: '10 full-stack available', percent: 55, barClass: 'mid' },
];

/** Map backend kpi_summary → conflictKpis strip shape */
function mapKpis(summary, total) {
  return [
    {
      label: 'Active Conflicts', value: String(summary.active ?? total ?? 0),
      iconType: 'conflict', iconBg: 'rgba(239,68,68,0.12)', iconColor: 'var(--neon-red)',
      iconClass: 'crit', trend: 'Needs immediate action',
    },
    {
      label: 'Resolved (All Time)', value: String(summary.resolved ?? 0),
      iconType: 'resolved', iconBg: 'rgba(34,211,165,0.12)', iconColor: 'var(--neon-green)',
      iconClass: 'ok', trend: 'Historical count',
    },
    {
      label: 'Avg Resolution', value: String(summary.avg_resolution_hrs ?? '—'),
      unit: summary.avg_resolution_hrs != null ? ' hrs' : '',
      iconType: 'clock', iconBg: 'rgba(6,182,212,0.12)', iconColor: 'var(--cyan)',
      iconClass: '', trend: 'Time to close a conflict',
    },
    {
      label: 'Pending Action', value: String(summary.pending_action ?? 0),
      iconType: 'pending', iconBg: 'rgba(245,197,66,0.12)', iconColor: 'var(--neon-yellow)',
      iconClass: 'warn', trend: 'Awaiting manager decision',
    },
    {
      label: 'Auto-Resolved', value: String(summary.auto_resolved ?? 0),
      iconType: 'auto', iconBg: 'rgba(168,85,247,0.12)', iconColor: 'var(--neon-purple, #a855f7)',
      iconClass: '', trend: 'By the engine',
    },
  ];
}

/** Map backend conflict → activeConflicts card shape */
function mapConflict(c, idx) {
  const initials = (c.trainer || '??').substring(0, 2).toUpperCase();
  const d1 = c.delivery_ids?.[0] || 'DEL-?';
  const d2 = c.delivery_ids?.[1] || 'DEL-?';
  const camp1 = c.campuses?.[0] || 'Unknown';
  const camp2 = c.campuses?.[1] || camp1;
  return {
    id: idx + 1,
    cardClass: '',
    avatar: initials,
    avatarClass: 'conf',
    name: c.trainer,
    meta: `${c.date} · ${c.type === 'double_booked' ? 'Double Booking' : c.type}`,
    severity: c.severity === 'high' ? 'Critical' : 'Warning',
    severityClass: c.severity === 'high' ? 'crit' : 'warn',
    leftLeg: { id: d1, name: camp1, meta: ['Delivery 1'] },
    rightLeg: { id: d2, name: camp2, meta: ['Delivery 2'] },
    relation: 'VS',
    resolveText: c.message || `Assign a replacement for ${d2}`,
    actions: ['Resolve', 'Escalate', 'Defer'],
    primaryAction: 'Resolve',
  };
}

export default function Conflicts({ active }) {
  const { data, error, refetch } = useGetConflictsQuery();
  const totalLabel = String(data?.total_conflicts ?? 0);
  const kpis = useMemo(
    () => (data?.kpi_summary ? mapKpis(data.kpi_summary, data?.total_conflicts ?? 0) : null),
    [data],
  );
  const conflicts = useMemo(() => (data?.conflicts ?? []).map(mapConflict), [data]);
  const proneDays = data?.conflict_prone_days ?? [];
  const logs = data?.resolution_log ?? [];

  if (error) return <ErrorPanel panelId="conflicts" active={active} error={error?.error || error?.message || 'Unknown error'} onRetry={() => refetch()} />;
  if (!data || !kpis) return <LoadingPanel panelId="conflicts" active={active} />;

  const renderKpiIcon = (type) => {
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
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
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
            <path d="M21 12a9 9 0 0 0-15-6.7L3 8" />
            <path d="M3 4v4h4" />
            <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" />
            <path d="M21 20v-4h-4" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="conflicts">
      {/* KPI strip */}
      <div className="kpi-strip">
        {kpis.map((kpi, idx) => (
          <div className="kpi" key={idx}>
            <div className="kpi-icon" style={{ background: kpi.iconBg, color: kpi.iconColor }}>
              {renderKpiIcon(kpi.iconType)}
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
        {/* Left: Conflict cards */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ font: '800 11px/1 var(--font)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
              Active Conflicts · Sorted By Severity
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span className="chip neutral">ALL · {totalLabel}</span>
              <span className="chip error">
                <span className="chip-dot"></span>CRITICAL · {conflicts.filter(c => c.severity === 'Critical').length}
              </span>
              <span className="chip warn">
                <span className="chip-dot"></span>WARNING · {conflicts.filter(c => c.severity !== 'Critical').length}
              </span>
            </div>
          </div>

          {conflicts.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
              No active conflicts detected.
            </div>
          )}

          {conflicts.map((conf) => (
            <div className={`conflict-card ${conf.cardClass}`} key={conf.id}>
              <div className="cc-head">
                <div className="cc-trainer">
                  <div className={`cc-avatar ${conf.avatarClass}`}>{conf.avatar}</div>
                  <div>
                    <div className="cc-name">{conf.name}</div>
                    <div className="cc-name-meta">{conf.meta}</div>
                  </div>
                </div>
                <span className={`cc-severity ${conf.severityClass}`}>
                  <span className="dot"></span>
                  {conf.severity}
                </span>
              </div>
              <div className="cc-versus">
                <div className="cc-leg">
                  <div className="cc-leg-id">{conf.leftLeg.id}</div>
                  <div className="cc-leg-name">{conf.leftLeg.name}</div>
                  <div className="cc-leg-meta">{conf.leftLeg.meta.map((m, i) => <span key={i}>{m}</span>)}</div>
                </div>
                <div className="cc-vs-icon">{conf.relation}</div>
                <div className="cc-leg">
                  <div className="cc-leg-id">{conf.rightLeg.id}</div>
                  <div className="cc-leg-name">{conf.rightLeg.name}</div>
                  <div className="cc-leg-meta">{conf.rightLeg.meta.map((m, i) => <span key={i}>{m}</span>)}</div>
                </div>
              </div>
              <div className="cc-resolve">
                <div className="cc-resolve-text">
                  <strong>Suggestion:</strong> {conf.resolveText}
                </div>
                <div className="cc-actions">
                  {conf.actions.map((act) => (
                    <button key={act} className={`cc-btn ${act === conf.primaryAction ? 'primary' : ''}`}>
                      {act}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Conflict-prone days + Resolution log + Cross-skill map */}
        <div className="conflict-aside">
          <div className="conf-mini-card">
            <div className="cmh-title">Conflict-Prone Days · Next 30</div>
            <div className="confdays-list">
              {proneDays.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '8px 0' }}>
                  No high-risk days detected.
                </div>
              )}
              {proneDays.map((cDay, idx) => (
                <div className={`confday-row ${cDay.severity}`} key={idx}>
                  <span className="d">{cDay.day}</span>
                  <span className="lab">{cDay.desc}</span>
                  <span className="v">{cDay.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="conf-mini-card">
            <div className="cmh-title">Resolution Log · Last 48 Hrs</div>
            <div className="timeline-log">
              {logs.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '8px 0' }}>
                  No resolution history yet.
                </div>
              )}
              {logs.map((log, idx) => (
                <div className="tl-row" key={idx}>
                  <span className="ts">{log.time || log.timestamp}</span>
                  <span className="msg">
                    <span className={`tag ${log.statusClass || log.status}`}>{log.status}</span>
                    {log.message || log.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

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
                    <i style={{ width: `${lane.percent}%` }}></i>
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
