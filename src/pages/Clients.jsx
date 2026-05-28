import { useMemo, useState, useEffect } from 'react';
import { useGetClientsQuery, useGetRequestTrackQuery } from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';
import RequirementModal from '../components/RequirementModal.jsx';
import { buildRequirementRow, findRawByDeliveryId } from '../lib/req.js';

/* ============================================================
   Clients page — logical client cards + drill-down drawer
   Data source: /api/v1/clients  (grouped by logical client key)
   ============================================================ */

// ---- Localized/Internationalized string constants --------------------
const STRINGS = {
  activeClients: 'Active Clients',
  activeClientsSub: 'University · Corporate · Internal',
  trainerDaysCommitted: 'Trainer-Days Committed',
  acrossActivePipeline: 'Across active pipeline',
  topClientByDemand: 'Top Client by Demand',
  highestTrainerDemand: 'Highest trainer demand',
  avgOccupancy: 'Avg Occupancy',
  acrossAllEngagements: 'Across all engagements',
  atRiskEngagements: 'At-Risk Engagements',
  needImmediateAttention: 'Need immediate attention',
  
  trainerDays: 'Trainer-Days',
  programmes: 'Programmes',
  active: 'active',
  occupancy: 'Occupancy',
  trainers: 'Trainers',
  intLabel: 'INT',
  freeLabel: 'FREE',
  delivery: 'delivery',
  deliveries: 'deliveries',
  unallocated: 'unallocated',
  activeStatus: 'Active',
  viewAccount: 'View Account',
  
  activeProgrammes: 'Active Programmes',
  completed: 'Completed',
  noDeliveryData: 'No delivery data available.',
  
  activeTrainers: 'Active Trainers',
  internal: 'Internal',
  freelancer: 'Freelancer',

  noTrainers: 'No trainers',
  unknown: 'Unknown',

  internalTrainersLabel: 'Internal Trainers',
  freelancerTrainersLabel: 'Freelancer Trainers',
  noTrainersAssigned: 'No trainers assigned to this delivery yet.',
  trainerDaysAllocated: 'trainer-days allocated total',
  totalProgrammes: 'total programmes',
  
  byDemand: 'By Demand',
  byOccupancy: 'By Occupancy',
  noClientData: 'No client data available.',
  
  clientsRanked: 'Clients · Ranked by Trainer Demand',
  logicalClientsDesc: 'logical clients · click',
  drillIntoDesc: 'to drill into programmes & trainer details'
};

// ---- Per-client logo colours (matches Calendar.jsx CLIENT_META exactly) ----
// Using inline styles avoids CSS-class gaps when cache hasn't refreshed yet.
const CLIENT_COLOR_MAP = {
  iamneo:   { bg: '#a855f7', text: '#fff' },
  skg:      { bg: '#22d3a5', text: '#1B1F2C' },
  lti:      { bg: '#06b6d4', text: '#fff' },
  kct:      { bg: '#f5c542', text: '#1B1F2C' },
  hexaware: { bg: '#fb923c', text: '#fff' },
  parul:    { bg: '#818cf8', text: '#fff' },
  stjoseph: { bg: '#f472b6', text: '#1B1F2C' },
  vit:      { bg: '#34d399', text: '#1B1F2C' },
  rec:      { bg: '#fbbf24', text: '#1B1F2C' },
  bit:      { bg: '#60a5fa', text: '#fff' },
  virtusa:  { bg: '#c084fc', text: '#1B1F2C' },
  other:    { bg: '#64748B', text: '#fff' },
};
function clientLogoStyle(client) {
  const entry = CLIENT_COLOR_MAP[client.client_key] || CLIENT_COLOR_MAP.other;
  return { background: entry.bg, color: entry.text };
}

// ---- KPI strip SVG Icons ----------------------------------------------
const ICON_CLIENTS = (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const ICON_DAYS = (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
  </svg>
);

const ICON_TOP = (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const ICON_OCC = (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
  </svg>
);

const ICON_RISK = (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

function mapKpis(k) {
  return [
    {
      label: STRINGS.activeClients,
      value: String(k.active_clients ?? 0),
      sub: STRINGS.activeClientsSub,
      style: {},
      accent: 'blue',
      icon: ICON_CLIENTS,
    },
    {
      label: STRINGS.trainerDaysCommitted,
      value: (k.trainer_days_committed ?? 0).toLocaleString(),
      sub: STRINGS.acrossActivePipeline,
      style: {},
      accent: 'cyan',
      icon: ICON_DAYS,
    },
    {
      label: STRINGS.topClientByDemand,
      value: k.top_client || 'N/A',
      sub: STRINGS.highestTrainerDemand,
      style: { fontSize: '16px' },
      accent: 'yellow',
      icon: ICON_TOP,
    },
    {
      label: STRINGS.avgOccupancy,
      value: `${k.avg_occupancy_pct ?? 0}%`,
      sub: STRINGS.acrossAllEngagements,
      style: {},
      accent: 'green',
      icon: ICON_OCC,
    },
    {
      label: STRINGS.atRiskEngagements,
      value: String(k.at_risk_count ?? 0),
      sub: STRINGS.needImmediateAttention,
      style: {},
      accent: 'red',
      icon: ICON_RISK,
    },
  ];
}

// ---- Date formatter ---------------------------------------------------
function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
  } catch {
    return iso;
  }
}

// ---- Status badge tone ------------------------------------------------
function statusTone(s = '') {
  const l = s.toLowerCase();
  if (l.includes('risk')) return 'warn';
  if (l.includes('track')) return 'ok';
  if (l.includes('complet')) return 'done';
  return 'open';
}

// ---- Delivery status label style ------------------------------------
function deliveryStatusClass(d) {
  const l = (d.status || '').toLowerCase();
  if (d.is_completed) return 'cl-d-status-done';
  if (l.includes('ongo')) return 'cl-d-status-ok';
  if (l.includes('upco')) return 'cl-d-status-info';
  return 'cl-d-status-open';
}


// ============================================================
// ClientCard
// ============================================================
function ClientCard({ client, onView }) {
  const tone = client.risk === 'warn' ? 'warn' : 'ok';

  return (
    <div className={`client-card ${client.rank_class || ''}`}>
      <div className="cl-rank">#{client.rank}</div>
      <div className="cl-head">
        <div className="cl-logo" style={clientLogoStyle(client)}>{client.logo || client.logo_initials || '??'}</div>
        <div>
          <div className="cl-name">{client.name}</div>
          <div className="cl-sub">{client.sub}</div>
        </div>
      </div>

      <div className="cl-metrics">
        <div className="cl-metric">
          <div className="m-lab">{STRINGS.trainerDays}</div>
          <div className="m-val" style={{ color: 'var(--neon-yellow)' }}>{client.trainer_days ?? 0}</div>
        </div>
        <div className="cl-metric">
          <div className="m-lab">{STRINGS.programmes}</div>
          <div className="m-val" style={{ color: 'var(--cyan)' }}>{client.active_programmes ?? 0}</div>
          <div className="m-sub">{STRINGS.active}</div>
        </div>
        <div className="cl-metric">
          <div className="m-lab">{STRINGS.occupancy}</div>
          <div className="m-val" style={{ color: client.occupancy_pct >= 75 ? 'var(--neon-green)' : client.occupancy_pct >= 40 ? 'var(--neon-yellow)' : 'var(--neon-red)' }}>{client.occupancy_pct ?? 0}%</div>
        </div>
        <div className="cl-metric">
          <div className="m-lab">{STRINGS.trainers}</div>
          <div className="m-val" style={{ color: 'var(--neon-purple)' }}>{client.total_trainers ?? 0}</div>
        </div>
      </div>

      {/* Internal / freelancer mini-bar */}
      {(client.total_internal > 0 || client.total_freelancer > 0) && (
        <div className="cl-split">
          <span className="cl-split-int">{client.total_internal} {STRINGS.intLabel}</span>
          <div className="cl-split-bar">
            <div
              className="cl-split-fill"
              style={{
                width: `${Math.round(
                  (client.total_internal / Math.max(client.total_internal + client.total_freelancer, 1)) * 100
                )}%`,
              }}
            />
          </div>
          <span className="cl-split-free">{client.total_freelancer} {STRINGS.freeLabel}</span>
        </div>
      )}

      {/* Gap warning */}
      {client.gap > 0 && (
        <div className="cl-gap-warn">
          ⚠ {client.gap} {client.gap === 1 ? STRINGS.delivery : STRINGS.deliveries} {STRINGS.unallocated}
        </div>
      )}

      <div className="cl-foot">
        <span className={`cl-tag ${tone}`}>
          <span className="dot" />
          {client.status || STRINGS.activeStatus}
        </span>
        <button type="button" className="btn-ghost cl-btn" onClick={() => onView(client)}>
          {STRINGS.viewAccount}
        </button>
      </div>
    </div>
  );
}


// ============================================================
// ClientDrawer  — slide-in from right
// ============================================================
const DRAWER_PAGE_SIZE = 8;

function ClientDrawer({ client, onClose, onPickProgramme }) {
  const [expandedDid, setExpandedDid] = useState(null);
  const [activeQ, setActiveQ] = useState('');
  const [completedQ, setCompletedQ] = useState('');
  const [activePage, setActivePage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  useEffect(() => { setActivePage(1); }, [activeQ]);
  useEffect(() => { setCompletedPage(1); }, [completedQ]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const toggle = (did) => setExpandedDid((prev) => (prev === did ? null : did));

  const filterFn = (q) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return () => true;
    return (d) => {
      const bag = [d.delivery_id, d.course, d.programme_name, d.track, d.subdomain].filter(Boolean).join(' ').toLowerCase();
      return bag.includes(needle);
    };
  };

  const allActive    = (client.deliveries || []).filter((d) => !d.is_completed);
  const allCompleted = (client.deliveries || []).filter((d) =>  d.is_completed);
  const active    = allActive.filter(filterFn(activeQ));
  const completed = allCompleted.filter(filterFn(completedQ));
  const activePageCount    = Math.max(1, Math.ceil(active.length    / DRAWER_PAGE_SIZE));
  const completedPageCount = Math.max(1, Math.ceil(completed.length / DRAWER_PAGE_SIZE));
  const activeSafePage     = Math.min(activePage,    activePageCount);
  const completedSafePage  = Math.min(completedPage, completedPageCount);
  const activeVisible    = active.slice((activeSafePage    - 1) * DRAWER_PAGE_SIZE, activeSafePage    * DRAWER_PAGE_SIZE);
  const completedVisible = completed.slice((completedSafePage - 1) * DRAWER_PAGE_SIZE, completedSafePage * DRAWER_PAGE_SIZE);
  const totalInt  = allActive.reduce((s, d) => s + (d.internal_count  || 0), 0);
  const totalFree = allActive.reduce((s, d) => s + (d.freelancer_count || 0), 0);
  const denom     = Math.max(totalInt + totalFree, 1);

  return (
    <>
      <div className="cl-drawer-overlay" onClick={onClose} />
      <aside className="cl-drawer">
        {/* ---- Header (compact, pipe-separated like Requirements) ---- */}
        <div className="cl-drawer-head">
          <div className="cl-drawer-logo" style={clientLogoStyle(client)}>{client.logo || client.logo_initials || '??'}</div>
          <div className="cl-drawer-ident">
            <div className="cl-drawer-ident-row">
              <span className="cl-drawer-name">{client.name}</span>
              <span className="cl-drawer-sep">|</span>
              <span className="cl-drawer-meta">{client.active_programmes ?? 0} {STRINGS.active}</span>
              {client.total_programmes != null && <>
                <span className="cl-drawer-sep">|</span>
                <span className="cl-drawer-meta">{client.total_programmes} {STRINGS.totalProgrammes}</span>
              </>}
            </div>
          </div>
          <button type="button" className="cl-drawer-close" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ---- Summary stats ---- */}
        <div className="cl-drawer-stats">
          <div className="cl-drawer-stat">
            <div className="cl-drawer-stat-n">{client.trainer_days}</div>
            <div className="cl-drawer-stat-l">{STRINGS.trainerDays}</div>
          </div>
          <div className="cl-drawer-stat">
            <div className="cl-drawer-stat-n">{client.total_trainers}</div>
            <div className="cl-drawer-stat-l">{STRINGS.activeTrainers}</div>
          </div>
          <div className="cl-drawer-stat">
            <div className="cl-drawer-stat-n" style={{ color: 'var(--neon-cyan)' }}>{totalInt}</div>
            <div className="cl-drawer-stat-l">{STRINGS.internal}</div>
          </div>
          <div className="cl-drawer-stat">
            <div className="cl-drawer-stat-n" style={{ color: 'var(--neon-yellow)' }}>{totalFree}</div>
            <div className="cl-drawer-stat-l">{STRINGS.freelancer}</div>
          </div>
        </div>

        {/* ---- Split bar ---- */}
        {(totalInt > 0 || totalFree > 0) && (
          <div className="cl-drawer-splitbar">
            <span className="cl-split-int">{Math.round((totalInt / denom) * 100)}% {STRINGS.intLabel}</span>
            <div className="cl-split-bar cl-split-bar-wide">
              <div className="cl-split-fill" style={{ width: `${Math.round((totalInt / denom) * 100)}%` }} />
            </div>
            <span className="cl-split-free">{Math.round((totalFree / denom) * 100)}% {STRINGS.freeLabel}</span>
          </div>
        )}

        {/* ---- Active programmes ---- */}
        {allActive.length > 0 && (
          <div className="cl-drawer-section">
            <div className="cl-drawer-section-head">
              <div className="cl-drawer-section-title">
                {STRINGS.activeProgrammes}
                <span className="cl-drawer-section-badge">{active.length}/{allActive.length}</span>
              </div>
              <div className="cl-drawer-search">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input type="search" placeholder="Filter…" value={activeQ} onChange={(e) => setActiveQ(e.target.value)} />
              </div>
            </div>
            {active.length === 0 ? (
              <div className="rqd-empty">No matches for that search.</div>
            ) : (
              <>
                <ul className="cl-delivery-list">
                  {activeVisible.map((d) => (
                    <DeliveryRow
                      key={d.delivery_id}
                      delivery={d}
                      expanded={expandedDid === d.delivery_id}
                      onToggle={() => toggle(d.delivery_id)}
                      onPick={() => onPickProgramme?.(d.delivery_id)}
                    />
                  ))}
                </ul>
                <DrawerPager
                  page={activeSafePage}
                  pageCount={activePageCount}
                  total={active.length}
                  pageSize={DRAWER_PAGE_SIZE}
                  onChange={setActivePage}
                />
              </>
            )}
          </div>
        )}

        {/* ---- Completed programmes ---- */}
        {allCompleted.length > 0 && (
          <div className="cl-drawer-section">
            <div className="cl-drawer-section-head">
              <div className="cl-drawer-section-title cl-drawer-section-title-muted">
                {STRINGS.completed}
                <span className="cl-drawer-section-badge">{completed.length}/{allCompleted.length}</span>
              </div>
              <div className="cl-drawer-search">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input type="search" placeholder="Filter…" value={completedQ} onChange={(e) => setCompletedQ(e.target.value)} />
              </div>
            </div>
            {completed.length === 0 ? (
              <div className="rqd-empty">No matches for that search.</div>
            ) : (
              <>
                <ul className="cl-delivery-list cl-delivery-list-dim">
                  {completedVisible.map((d) => (
                    <DeliveryRow
                      key={d.delivery_id}
                      delivery={d}
                      expanded={expandedDid === d.delivery_id}
                      onToggle={() => toggle(d.delivery_id)}
                      onPick={() => onPickProgramme?.(d.delivery_id)}
                    />
                  ))}
                </ul>
                <DrawerPager
                  page={completedSafePage}
                  pageCount={completedPageCount}
                  total={completed.length}
                  pageSize={DRAWER_PAGE_SIZE}
                  onChange={setCompletedPage}
                />
              </>
            )}
          </div>
        )}

        {(client.deliveries || []).length === 0 && (
          <div className="cl-drawer-empty">
            {client.deliveries
              ? STRINGS.noDeliveryData
              : 'Programme details will appear after the next data sync.'}
          </div>
        )}
      </aside>
    </>
  );
}


function DrawerPager({ page, pageCount, total, pageSize, onChange }) {
  if (pageCount <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <div className="cl-drawer-pager">
      <span className="cl-drawer-pager-info">
        {start}–{end} of {total}
      </span>
      <div className="cl-drawer-pager-ctrls">
        <button type="button" className="cl-drawer-pager-btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>
        <span className="cl-drawer-pager-page">{page} / {pageCount}</span>
        <button type="button" className="cl-drawer-pager-btn" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>›</button>
      </div>
    </div>
  );
}

// ============================================================
// DeliveryRow  — one programme inside the drawer
// ============================================================
function DeliveryRow({ delivery: d, expanded, onToggle, onPick }) {
  const stCls = deliveryStatusClass(d);
  const hasTrainers = d.internal_count > 0 || d.freelancer_count > 0;

  return (
    <li className={`cl-d-row${expanded ? ' is-expanded' : ''}`}>
      {onPick && (
        <button
          type="button"
          className="cl-d-open"
          aria-label="Open programme detail"
          title="Open programme detail"
          onClick={(e) => { e.stopPropagation(); onPick(); }}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17 17 7" /><path d="M7 7h10v10" />
          </svg>
        </button>
      )}
      <button type="button" className="cl-d-row-btn" onClick={onToggle}>
        <div className="cl-d-row-left">
          <div className="cl-d-course">{d.course_name}</div>
          <div className="cl-d-meta">
            <span className="cl-d-id">{d.delivery_id}</span>
            {d.campus && <><span className="cl-d-dot">{'·'}</span><span>{d.campus}</span></>}
          </div>
          <div className="cl-d-dates">
            {fmtDate(d.start_date)} → {fmtDate(d.end_date)}
          </div>
        </div>
        <div className="cl-d-row-right">
          <div className="cl-d-counts">
            {hasTrainers ? (
              <>
                <span className="cl-d-cnt-int" title={STRINGS.intLabel}>{d.internal_count} {STRINGS.intLabel}</span>
                <span className="cl-d-cnt-free" title={STRINGS.freeLabel}>{d.freelancer_count} {STRINGS.freeLabel}</span>
              </>
            ) : (
              <span className="cl-d-cnt-none">{STRINGS.noTrainers}</span>
            )}
          </div>
          <span className={`cl-d-status ${stCls}`}>{d.status || STRINGS.unknown}</span>
          <svg
            className={`cl-d-chevron${expanded ? ' is-open' : ''}`}
            viewBox="0 0 24 24" width="12" height="12" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* ---- Expanded trainer breakdown ---- */}
      {expanded && (
        <div className="cl-d-detail">
          {d.internal_count > 0 && (
            <div className="cl-trainer-section">
              <div className="cl-trainer-section-label">
                <span className="cl-ts-dot cl-ts-dot-int" />
                {STRINGS.internalTrainersLabel} ({d.internal_count})
              </div>
              <div className="cl-trainer-chips">
                {d.internal_trainers.map((name) => (
                  <span key={name} className="cl-trainer-chip cl-chip-int">{name}</span>
                ))}
              </div>
            </div>
          )}
          {d.freelancer_count > 0 && (
            <div className="cl-trainer-section">
              <div className="cl-trainer-section-label">
                <span className="cl-ts-dot cl-ts-dot-free" />
                {STRINGS.freelancerTrainersLabel} ({d.freelancer_count})
              </div>
              <div className="cl-trainer-chips">
                {d.freelancer_trainers.map((name) => (
                  <span key={name} className="cl-trainer-chip cl-chip-free">{name}</span>
                ))}
              </div>
            </div>
          )}
          {!hasTrainers && (
            <div className="cl-trainer-empty">{STRINGS.noTrainersAssigned}</div>
          )}
          {d.trainer_days > 0 && (
            <div className="cl-d-days-info">{d.trainer_days} {STRINGS.trainerDaysAllocated}</div>
          )}
        </div>
      )}
    </li>
  );
}


// ============================================================
// Main page
// ============================================================
export default function Clients({ active }) {
  const { data, error, refetch } = useGetClientsQuery();
  const { data: rtRes } = useGetRequestTrackQuery({ limit: 500 });
  const rtRows = rtRes?.rows || [];
  const rtHeaders = rtRes?.headers || [];
  const [selectedClient, setSelectedClient] = useState(null);
  const [pickedReq, setPickedReq] = useState(null);

  const openProgramme = (deliveryId) => {
    if (!deliveryId) {
      window.notify?.('Programme details unavailable', 'No Delivery ID is attached to this entry.', 'warn');
      return;
    }
    const raw = findRawByDeliveryId(rtRows, deliveryId);
    if (!raw) {
      window.notify?.('Programme not found', `No request-track row matches "${deliveryId}".`, 'warn');
      return;
    }
    setPickedReq(buildRequirementRow(raw));
  };

  const kpis    = useMemo(() => (data?.kpis ? mapKpis(data.kpis) : null), [data]);
  const clients = useMemo(() => data?.clients ?? [], [data]);

  if (error) return (
    <ErrorPanel panelId="clients" active={active}
      error={error?.error || error?.message || 'Unknown error'}
      onRetry={() => refetch()} />
  );
  if (!data || !kpis) return <LoadingPanel panelId="clients" active={active} />;

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="clients">

      {/* KPI strip */}
      <div className="kpi-strip">
        {kpis.map((kpi, idx) => (
          <div className={`kpi kpi-accent-${kpi.accent}`} key={idx}>
            <div className="kpi-head">
              <div className="kpi-label">{kpi.label}</div>
              <div className={`kpi-icon ${kpi.accent}`}>
                {kpi.icon}
              </div>
            </div>
            <div className="kpi-value" style={kpi.style}>{kpi.value}</div>
            <div className="kpi-sub">{kpi.sub}</div>
          </div>
        ))}
      </div>


      {/* Client cards */}
      <div className="card" style={{ marginTop: '18px' }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {STRINGS.clientsRanked}
            </div>
            <div className="section-sub" style={{ marginTop: '6px' }}>
              {clients.length} {STRINGS.logicalClientsDesc} <strong>{STRINGS.viewAccount}</strong> {STRINGS.drillIntoDesc}
            </div>
          </div>
          <div className="section-actions">
            <div className="range-segment">
              <button className="active">{STRINGS.byDemand}</button>
              <button>{STRINGS.byOccupancy}</button>
            </div>
          </div>
        </div>

        <div className="client-grid">
          {clients.map((c, idx) => (
            <ClientCard
              key={c.client_key || idx}
              client={c}
              onView={(cl) => setSelectedClient(cl)}
            />
          ))}
          {clients.length === 0 && (
            <div style={{ color: 'var(--text-muted)', padding: '32px', textAlign: 'center' }}>
              {STRINGS.noClientData}
            </div>
          )}
        </div>
      </div>

      {/* Drawer */}
      {selectedClient && (
        <ClientDrawer
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onPickProgramme={openProgramme}
        />
      )}

      {pickedReq && (
        <RequirementModal
          row={pickedReq}
          headers={rtHeaders}
          onClose={() => setPickedReq(null)}
        />
      )}
    </section>
  );
}
