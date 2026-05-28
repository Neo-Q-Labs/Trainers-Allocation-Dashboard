import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGetConflictsQuery } from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';

/* ============================================================
   Conflicts — enriched cards + click-to-expand detail drawer.
   Shows trainer, programmes, client, campus, training window,
   and a timeline overlap visualisation.
   ============================================================ */

const crossSkillsMap = [
  { path: 'Java → Python',   desc: '12 trainers cross-certified', percent: 62, barClass: 'mid' },
  { path: 'Cloud → DevOps',  desc: '8 trainers can switch',       percent: 48, barClass: 'warn' },
  { path: 'Testing → Agile', desc: '15 trainers dual-track',      percent: 78, barClass: 'ok' },
  { path: 'React → Node',    desc: '10 full-stack available',      percent: 55, barClass: 'mid' },
];

function conflictKey(c) {
  return `${c.trainer}|${c.date}|${[...(c.delivery_ids || [])].sort().join(',')}`;
}

function mapKpis(summary, liveActive) {
  return [
    { label: 'Active Conflicts',  value: String(liveActive ?? summary.active ?? 0), accent: 'red',    iconType: 'conflict', sub: 'Needs immediate action' },
    { label: 'Resolved (All Time)', value: String(summary.resolved ?? 0),           accent: 'green',  iconType: 'resolved', sub: 'Historical count' },
    { label: 'Avg Resolution',    value: String(summary.avg_resolution_hrs ?? '—'), unit: summary.avg_resolution_hrs != null ? ' hrs' : '', accent: 'cyan', iconType: 'clock', sub: 'Time to close a conflict' },
    { label: 'Pending Action',    value: String(summary.pending_action ?? 0),       accent: 'yellow', iconType: 'pending',  sub: 'Awaiting manager decision' },
    { label: 'Auto-Resolved',     value: String(summary.auto_resolved ?? 0),        accent: 'purple', iconType: 'auto',     sub: 'By the engine' },
  ];
}

function mapLeg(leg) {
  // course_name is often blank in the Excel — fall back to campus (which holds
  // the track/category in this dataset) then training_category then the ID.
  const rawName = (leg.course_name || '').trim();
  const name = rawName && rawName !== '—'
    ? rawName
    : ((leg.campus || '').trim() || (leg.training_category || '').trim() || leg.delivery_id || '—');
  return {
    id:               leg.delivery_id       || '—',
    name,
    campus:           leg.campus            || '',
    clientName:       leg.client_name       || '—',
    trainingCategory: leg.training_category || '',
    startDate:        leg.start_date        || '',
    endDate:          leg.end_date          || '',
    status:           leg.status            || '',
  };
}

function mapConflict(c, idx) {
  const legs = (c.legs || []).map(mapLeg);
  // Fallback legs from delivery_ids / campuses if legs array is empty
  if (legs.length === 0 && (c.delivery_ids || []).length > 0) {
    (c.delivery_ids || []).forEach((did, i) => {
      legs.push({ id: did, name: '—', campus: (c.campuses || [])[i] || '', clientName: '—', trainingCategory: '', startDate: '', endDate: '', status: '' });
    });
  }
  // Determine whether conflicting sessions are at different locations
  const uniqueLocations = [...new Set(legs.map(l => l.campus).filter(Boolean))];
  const differentLocations = uniqueLocations.length > 1;

  return {
    key:              conflictKey(c),
    id:               idx + 1,
    avatar:           (c.trainer || '??').substring(0, 2).toUpperCase(),
    name:             c.trainer || 'Unknown',
    date:             c.date    || '',
    type:             c.type    || 'double_booked',
    meta:             `${c.date} · ${c.type === 'double_booked' ? 'Double Booking' : c.type}`,
    severity:         c.severity === 'high' ? 'Critical' : 'Warning',
    severityClass:    c.severity === 'high' ? 'crit'     : 'warn',
    legs,
    differentLocations,
    uniqueLocations,
    suggestion: c.message || `Assign a replacement trainer for one of the deliveries on ${c.date}.`,
    totalLegs:  (c.delivery_ids || []).length,
  };
}

// ---- Helpers -----------------------------------------------------------

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function fmtShort(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch { return iso; }
}

/** Compute overlap bar widths/offsets as % of the full span across all legs. */
function computeOverlap(legs, conflictDate) {
  const parsed = legs.map(l => ({
    start: l.startDate ? new Date(l.startDate).getTime() : null,
    end:   l.endDate   ? new Date(l.endDate).getTime()   : null,
  }));
  const validDates = parsed.filter(p => p.start && p.end && p.start <= p.end);
  if (validDates.length < 2) return null;

  const minT = Math.min(...validDates.map(p => p.start));
  const maxT = Math.max(...validDates.map(p => p.end));
  const span = maxT - minT || 1;

  const conflictT = conflictDate ? new Date(conflictDate).getTime() : null;
  const conflictPct = conflictT ? Math.max(0, Math.min(100, ((conflictT - minT) / span) * 100)) : null;

  const bars = parsed.map((p, i) => {
    if (!p.start || !p.end) return { left: 0, width: 100, label: legs[i].name };
    const left  = ((p.start - minT) / span) * 100;
    const width = ((p.end   - p.start) / span) * 100;
    return { left, width, label: legs[i].name };
  });

  return { bars, conflictPct, rangeStart: fmtShort(legs[0]?.startDate), rangeEnd: fmtShort(legs[legs.length - 1]?.endDate) };
}

// ---- KPI icons ---------------------------------------------------------
function KpiIcon({ type }) {
  switch (type) {
    case 'conflict': return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
    case 'resolved': return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
    case 'clock': return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    );
    case 'pending': return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );
    case 'auto': return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 0 0-15-6.7L3 8" /><path d="M3 4v4h4" />
        <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" /><path d="M21 20v-4h-4" />
      </svg>
    );
    default: return null;
  }
}

// ---- Conflict Detail Drawer --------------------------------------------
const LEG_COLORS = [
  { bar: 'var(--accent)',       text: 'var(--accent)'       },
  { bar: 'var(--neon-green)',   text: 'var(--neon-green)'   },
  { bar: '#f5c542',             text: '#f5c542'             },
  { bar: '#fb923c',             text: '#fb923c'             },
];

function ConflictDrawer({ conf, onClose, onAction, alreadyHandled }) {
  const overlap = useMemo(
    () => conf ? computeOverlap(conf.legs, conf.date) : null,
    [conf]
  );

  // Close on Escape
  useEffect(() => {
    if (!conf) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [conf, onClose]);

  if (!conf) return null;

  const typeLabel = conf.type === 'double_booked' ? 'Double Booking' : conf.type;
  const handled   = alreadyHandled?.action;

  function doAction(action) {
    onAction(conf.key, action);
    onClose();
  }

  return (
    <>
      {/* Overlay */}
      <div className="cf-drawer-overlay" onClick={onClose} />

      {/* Drawer panel */}
      <div className="cf-drawer" role="dialog" aria-modal="true" aria-label="Conflict Details">

        {/* ---- Header ---- */}
        <div className="cf-dh-header">
          <div className="cf-dh-trainer">
            <div className="cc-avatar conf cf-dh-avatar">{conf.avatar}</div>
            <div>
              <div className="cf-dh-name">{conf.name}</div>
              <div className="cf-dh-meta">{typeLabel} &middot; {fmtDate(conf.date)}</div>
            </div>
          </div>
          <div className="cf-dh-right">
            <span className={`cc-severity ${conf.severityClass}`}>
              <span className="dot" />{conf.severity}
            </span>
            <button className="cf-dh-close" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>

        {/* ---- Why box ---- */}
        <div className="cf-why-box">
          <div className="cf-why-title">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
              <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
            Why this conflict occurred
          </div>
          <p className="cf-why-body">
            <strong>{conf.name}</strong> is assigned to{' '}
            <strong>{conf.legs.length} session{conf.legs.length !== 1 ? 's' : ''}</strong>{' '}
            simultaneously on <strong>{fmtDate(conf.date)}</strong>.{' '}
            {conf.differentLocations ? (
              <>
                These sessions are at <strong>different locations</strong>{' '}
                ({conf.uniqueLocations.join(' · ')}){' '}
                — a trainer can only be physically present at one location at a time,
                making it impossible to attend all of them on the same day.
              </>
            ) : (
              <>
                All sessions are scheduled at the same time, creating a double-booking.
                Only one session can proceed as planned — the others need to be reassigned
                to a different trainer or rescheduled.
              </>
            )}
          </p>
        </div>

        {/* ---- Delivery legs ---- */}
        <div className="cf-section-label">Conflicting Programmes ({conf.legs.length})</div>
        <div className="cf-dleg-grid">
          {conf.legs.map((leg, i) => (
            <div className="cf-dleg-card" key={leg.id} style={{ '--leg-accent': LEG_COLORS[i % LEG_COLORS.length].bar }}>
              <div className="cf-dleg-num">Programme {i + 1}</div>
              <div className="cf-dleg-course" title={leg.name}>{leg.name}</div>
              <div className="cf-dleg-tags">
                {leg.clientName && leg.clientName !== '—' && (
                  <span className="cf-dleg-tag client">{leg.clientName}</span>
                )}
                {leg.trainingCategory && (
                  <span className="cf-dleg-tag cat">{leg.trainingCategory}</span>
                )}
              </div>
              <div className="cf-dleg-details">
                {/* Location / Campus / Track — most important field for conflict context */}
                {leg.campus && (
                  <div className="cf-dleg-row">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    <span>
                      <span className="cf-dleg-field-label">Location / Track</span>
                      {leg.campus}
                    </span>
                  </div>
                )}
                {/* Training window */}
                {(leg.startDate || leg.endDate) && (
                  <div className="cf-dleg-row">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    <span>
                      <span className="cf-dleg-field-label">Training window</span>
                      {fmtDate(leg.startDate)} &rarr; {fmtDate(leg.endDate)}
                    </span>
                  </div>
                )}
                {/* Conflict date highlight */}
                <div className="cf-dleg-row cf-dleg-conflict-date">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" style={{color:'#ef4444',stroke:'#ef4444'}}><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
                  <span>
                    <span className="cf-dleg-field-label">Conflict date</span>
                    <span style={{color:'#ef4444',fontWeight:600}}>{fmtDate(conf.date)}</span>
                  </span>
                </div>
                {/* Delivery ID */}
                <div className="cf-dleg-row">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                  <span>
                    <span className="cf-dleg-field-label">Delivery ID</span>
                    <span className="cf-dleg-id">{leg.id}</span>
                  </span>
                </div>
                {leg.status && (
                  <div className="cf-dleg-row">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>
                      <span className="cf-dleg-field-label">Status</span>
                      {leg.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ---- Overlap timeline ---- */}
        {overlap ? (
          <>
            <div className="cf-section-label">Schedule Overlap</div>
            <div className="cf-overlap-viz">
              <div className="cf-overlap-range">
                <span>{overlap.rangeStart}</span>
                <span>{overlap.rangeEnd}</span>
              </div>
              {overlap.bars.map((bar, i) => (
                <div className="cf-overlap-track" key={i}>
                  <div className="cf-overlap-label" title={bar.label}>
                    P{i + 1}
                  </div>
                  <div className="cf-overlap-rail">
                    <div
                      className="cf-overlap-bar"
                      style={{
                        left:  `${bar.left}%`,
                        width: `${Math.max(bar.width, 4)}%`,
                        background: LEG_COLORS[i % LEG_COLORS.length].bar,
                      }}
                    />
                    {overlap.conflictPct !== null && (
                      <div className="cf-overlap-marker" style={{ left: `${overlap.conflictPct}%` }}>
                        <div className="cf-overlap-marker-line" />
                        {i === 0 && <div className="cf-overlap-marker-label">Conflict date</div>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="cf-section-label">Schedule Overlap</div>
            <div className="cf-overlap-viz cf-overlap-conceptual">
              {conf.legs.map((leg, i) => (
                <div className="cf-overlap-track" key={i}>
                  <div className="cf-overlap-label">P{i + 1}</div>
                  <div className="cf-overlap-rail">
                    <div
                      className="cf-overlap-bar"
                      style={{
                        left:  `${i === 0 ? 5 : 20}%`,
                        width: `${i === 0 ? 65 : 55}%`,
                        background: LEG_COLORS[i % LEG_COLORS.length].bar,
                      }}
                    />
                    <div className="cf-overlap-marker" style={{ left: `${i === 0 ? 40 : 35}%` }}>
                      <div className="cf-overlap-marker-line" />
                      {i === 0 && <div className="cf-overlap-marker-label">Conflict date</div>}
                    </div>
                  </div>
                </div>
              ))}
              <div className="cf-overlap-note">Approximate — exact dates unavailable for this delivery</div>
            </div>
          </>
        )}

        {/* ---- Suggestion ---- */}
        <div className="cf-suggestion-box">
          <svg className="copilot-sparkle" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--neon-green)' }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83M12 8l1.5 2.5L16 12l-2.5 1.5L12 16l-1.5-2.5L8 12l2.5-1.5z" />
          </svg>
          <div><strong>Copilot suggestion</strong> &mdash; {conf.suggestion}</div>
        </div>

        {/* ---- Actions ---- */}
        {handled ? (
          <div className="cf-daction-handled">
            <span className={`tag ${handled === 'Resolve' ? 'ok' : handled === 'Escalate' ? 'warn' : 'info'}`}>
              {handled === 'Resolve' ? 'RESOLVED' : handled === 'Escalate' ? 'ESCALATED' : 'DEFERRED'}
            </span>
            Marked this session &mdash;&nbsp;
            <button className="cf-undo-link" onClick={() => { onAction(conf.key, null); }}>Undo</button>
          </div>
        ) : (
          <div className="cf-daction-row">
            <button className="cc-btn primary" onClick={() => doAction('Resolve')}>RESOLVE</button>
            <button className="cc-btn"         onClick={() => doAction('Escalate')}>ESCALATE</button>
            <button className="cc-btn"         onClick={() => doAction('Defer')}>DEFER</button>
          </div>
        )}

      </div>
    </>
  );
}

// ---- Conflict card (compact, clickable) --------------------------------
function ConflictCard({ conf, onOpen }) {
  const leg1 = conf.legs[0];
  const leg2 = conf.legs[1];
  return (
    <div
      className={`conflict-card cf-clickable ${conf.severityClass === 'warn' ? 'warn' : ''}`}
      onClick={() => onOpen(conf)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOpen(conf); }}
    >
      {/* Card header */}
      <div className="cc-head">
        <div className="cc-trainer">
          <div className="cc-avatar conf">{conf.avatar}</div>
          <div>
            <div className="cc-name">{conf.name}</div>
            <div className="cc-name-meta">{conf.meta}</div>
          </div>
        </div>
        <div className="cc-head-right">
          <span className={`cc-severity ${conf.severityClass}`}>
            <span className="dot" />{conf.severity}
          </span>
          <svg className="cf-card-arrow" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {/* Versus section */}
      <div className="cc-versus">
        {/* Leg 1 */}
        <div className="cc-leg">
          {leg1 ? (
            <>
              <div className="cc-leg-name">{leg1.name}</div>
              {leg1.clientName && leg1.clientName !== '—' && (
                <div className="cc-leg-meta"><span className="cf-client-tag">{leg1.clientName}</span></div>
              )}
              {leg1.campus && (
                <div className="cc-leg-meta"><span>{leg1.campus}</span></div>
              )}
            </>
          ) : <div className="cc-leg-name">—</div>}
        </div>

        <div className="cc-vs-icon">
          {conf.totalLegs > 2 ? `+${conf.totalLegs - 1}` : 'VS'}
        </div>

        {/* Leg 2 */}
        <div className="cc-leg">
          {leg2 ? (
            <>
              <div className="cc-leg-name">{leg2.name}</div>
              {leg2.clientName && leg2.clientName !== '—' && (
                <div className="cc-leg-meta"><span className="cf-client-tag">{leg2.clientName}</span></div>
              )}
              {leg2.campus && (
                <div className="cc-leg-meta"><span>{leg2.campus}</span></div>
              )}
            </>
          ) : <div className="cc-leg-name">—</div>}
        </div>
      </div>

      {/* Click hint */}
      <div className="cf-card-hint">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        Click to view full details &amp; take action
      </div>
    </div>
  );
}

// ---- Main page ---------------------------------------------------------
export default function Conflicts({ active }) {
  const { data, error, refetch } = useGetConflictsQuery();

  const [handled,        setHandled]        = useState(() => new Map());
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterSearch,   setFilterSearch]   = useState('');
  const [selectedConf,   setSelectedConf]   = useState(null);

  const rawConflicts = useMemo(() => (data?.conflicts ?? []).map(mapConflict), [data]);
  const proneDays    = data?.conflict_prone_days ?? [];

  const resolvedCount  = useMemo(() => [...handled.values()].filter(h => h.action === 'Resolve').length,  [handled]);
  const escalatedCount = useMemo(() => [...handled.values()].filter(h => h.action === 'Escalate').length, [handled]);
  const deferredCount  = useMemo(() => [...handled.values()].filter(h => h.action === 'Defer').length,    [handled]);
  const liveActive     = Math.max(0, (data?.total_conflicts ?? 0) - handled.size);

  const kpis = useMemo(() => {
    if (!data?.kpi_summary) return null;
    const base = data.kpi_summary;
    return mapKpis({ ...base, resolved: (base.resolved || 0) + resolvedCount, pending_action: Math.max(0, (base.pending_action || 0) - resolvedCount) + escalatedCount + deferredCount }, liveActive);
  }, [data, resolvedCount, escalatedCount, deferredCount, liveActive]);

  const resolutionLog = useMemo(() => {
    const local = [...handled.entries()].reverse().map(([key, info]) => {
      if (!info.action) return null;
      const trainer = key.split('|')[0] || '';
      const date    = key.split('|')[1] || '';
      const labelMap = { Resolve: 'RESOLVED', Escalate: 'ESCALATED', Defer: 'DEFERRED' };
      const classMap = { Resolve: 'ok', Escalate: 'warn', Defer: 'info' };
      return { time: info.time, status: labelMap[info.action] || info.action.toUpperCase(), statusClass: classMap[info.action] || 'info', message: `${trainer} on ${date}` };
    }).filter(Boolean);
    const backend = (data?.resolution_log ?? []).map(log => ({ time: log.time || log.timestamp || '', status: log.status || '', statusClass: log.statusClass || 'info', message: log.message || log.text || '' }));
    return [...local, ...backend];
  }, [handled, data]);

  const visibleConflicts = useMemo(() => rawConflicts.filter(conf => {
    if (handled.has(conf.key) && handled.get(conf.key)?.action) return false;
    if (filterSeverity === 'CRITICAL' && conf.severity !== 'Critical') return false;
    if (filterSeverity === 'WARNING'  && conf.severity !== 'Warning')  return false;
    if (filterSearch.trim()) {
      const needle = filterSearch.trim().toLowerCase();
      if (!conf.name.toLowerCase().includes(needle)) return false;
    }
    return true;
  }), [rawConflicts, handled, filterSeverity, filterSearch]);

  const handleAction = useCallback((key, action) => {
    const now     = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setHandled(prev => {
      const next = new Map(prev);
      if (action === null) { next.delete(key); } else { next.set(key, { action, time: timeStr }); }
      return next;
    });
  }, []);

  const openDrawer  = useCallback((conf) => setSelectedConf(conf), []);
  const closeDrawer = useCallback(() => setSelectedConf(null),     []);

  if (error) return <ErrorPanel panelId="conflicts" active={active} error={error?.error || error?.message || 'Unknown error'} onRetry={() => refetch()} />;
  if (!data || !kpis) return <LoadingPanel panelId="conflicts" active={active} />;

  const criticalCount = visibleConflicts.filter(c => c.severity === 'Critical').length;
  const warningCount  = visibleConflicts.filter(c => c.severity === 'Warning').length;

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="conflicts">

      {/* Detail drawer */}
      <ConflictDrawer
        conf={selectedConf}
        onClose={closeDrawer}
        onAction={handleAction}
        alreadyHandled={selectedConf ? handled.get(selectedConf.key) : null}
      />

      {/* KPI strip */}
      <div className="kpi-strip">
        {kpis.map((kpi, idx) => (
          <div className={`kpi kpi-accent-${kpi.accent}`} key={idx}>
            <div className="kpi-head">
              <div className="kpi-label">{kpi.label}</div>
              <div className={`kpi-icon ${kpi.accent}`}><KpiIcon type={kpi.iconType} /></div>
            </div>
            <div className="kpi-value">{kpi.value}{kpi.unit && <span className="unit">{kpi.unit}</span>}</div>
            <div className="kpi-sub">{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div className="conflict-grid">

        {/* ---- Left: Conflict list ---- */}
        <div>
          <div className="cf-list-head">
            <div className="cf-list-title">Active Conflicts &middot; Sorted By Severity</div>
            <div className="cf-filter-row">
              <button className={`chip ${filterSeverity === 'ALL' ? 'cf-chip-active neutral' : 'neutral'}`} onClick={() => setFilterSeverity('ALL')}>ALL &middot; {liveActive}</button>
              <button className={`chip ${filterSeverity === 'CRITICAL' ? 'cf-chip-active error' : 'error'}`} onClick={() => setFilterSeverity(s => s === 'CRITICAL' ? 'ALL' : 'CRITICAL')}><span className="chip-dot" />CRITICAL &middot; {criticalCount}</button>
              <button className={`chip ${filterSeverity === 'WARNING'  ? 'cf-chip-active warn'  : 'warn'}`}  onClick={() => setFilterSeverity(s => s === 'WARNING'  ? 'ALL' : 'WARNING')}><span className="chip-dot"  />WARNING &middot; {warningCount}</button>
              <div className="cf-search-wrap">
                <svg className="cf-search-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input className="cf-search-input" type="text" placeholder="Search trainer…" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
                {filterSearch && <button className="cf-search-clear" onClick={() => setFilterSearch('')} aria-label="Clear">&times;</button>}
              </div>
            </div>
          </div>

          {visibleConflicts.length === 0 ? (
            <div className="cf-empty">
              {[...handled.values()].filter(h => h.action).length > 0
                ? `All conflicts handled this session. Great work!`
                : 'No active conflicts detected.'}
            </div>
          ) : (
            visibleConflicts.map(conf => (
              <ConflictCard key={conf.key} conf={conf} onOpen={openDrawer} />
            ))
          )}

          {[...handled.values()].filter(h => h.action).length > 0 && visibleConflicts.length > 0 && (
            <div className="cf-handled-note">
              {[...handled.values()].filter(h => h.action).length} conflict{[...handled.values()].filter(h => h.action).length !== 1 ? 's' : ''} handled this session &middot;&nbsp;
              <button className="cf-undo-link" onClick={() => setHandled(new Map())}>Undo all</button>
            </div>
          )}
        </div>

        {/* ---- Right: Aside ---- */}
        <div className="conflict-aside">

          <div className="conf-mini-card">
            <div className="cmh-title">Conflict-Prone Days &middot; Next 30</div>
            <div className="confdays-list">
              {proneDays.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '8px 0' }}>No high-risk days detected.</div>
              ) : proneDays.map((cDay, idx) => (
                <div className={`confday-row ${cDay.severity}`} key={idx}>
                  <span className="d">{cDay.day}</span>
                  <span className="lab">{cDay.desc}</span>
                  <span className="v">{cDay.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="conf-mini-card">
            <div className="cmh-title">
              Resolution Log &middot; Last 48 Hrs
              {resolutionLog.length > 0 && <span className="cf-log-badge">{resolutionLog.length}</span>}
            </div>
            <div className="timeline-log">
              {resolutionLog.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '8px 0' }}>No resolution history yet.</div>
              ) : resolutionLog.map((log, idx) => (
                <div className="tl-row" key={idx}>
                  <span className="ts">{log.time}</span>
                  <span className="msg"><span className={`tag ${log.statusClass}`}>{log.status}</span>{log.message}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="conf-mini-card">
            <div className="cmh-title">Cross-Skill Quick Map</div>
            <div className="lanes-row">
              {crossSkillsMap.map((lane, idx) => (
                <div className="lane" key={idx}>
                  <div className="lane-left">
                    <div className="lane-name">
                      {lane.path.split(' → ')[0]} → {lane.path.split(' → ')[1]}
                      <small>{lane.desc}</small>
                    </div>
                    <div className={`lane-bar ${lane.barClass}`}><i style={{ width: `${lane.percent}%` }} /></div>
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
