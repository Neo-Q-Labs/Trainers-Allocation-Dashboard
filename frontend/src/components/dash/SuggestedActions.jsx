import { ICONS } from './icons.js';

/* SuggestedActions — feed of next-best actions sourced primarily from
   /api/v1/kpis.suggested_actions, plus a couple of synthesised entries
   derived from the live pending + conflicts state so the panel always
   has something concrete to act on. */

const SEVERITY_TONE = { high: 'high', medium: 'med', low: 'low' };

const ACTION_ICON = {
  gap:        ICONS.hire,
  conflict:   ICONS.swap,
  ready:      ICONS.check,
  capacity:   ICONS.beaker,
  default:    ICONS.spark,
};

const ACTION_ROUTE = {
  'Go to Pending Allocations': 'pending',
  'Review Conflicts':          'conflicts',
  'Open OASIS':                'oasis',
  'Open Matrix':               'matrix',
};

export default function SuggestedActions({ actions = [], pending = {}, onNavigate }) {
  const slots = pending?.slots || [];
  const enriched = enrichActions(actions, slots);

  return (
    <div className="dash-card dash-actions">
      <div className="dash-card-head">
        <div className="dash-card-title">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 10v6m11-11h-6M7 12H1m17.66-7.66l-4.24 4.24M9.58 14.42l-4.24 4.24m0-13.32 4.24 4.24m4.24 4.24 4.24 4.24" />
          </svg>
          TOP SUGGESTED ACTIONS
        </div>
      </div>
      <ul className="dash-actions-list">
        {enriched.map((a, i) => {
          const tone = SEVERITY_TONE[a.severity] || 'med';
          const icon = ACTION_ICON[a.type] || ACTION_ICON.default;
          const route = ACTION_ROUTE[a.action] || ACTION_ROUTE[a.cta] || null;
          const onClick = () => {
            if (route && onNavigate) onNavigate(route);
          };
          return (
            <li key={i} className={`dash-action dash-action-${tone}`}>
              <button type="button" className="dash-action-btn" onClick={onClick}>
                <span className={`dash-action-icon dash-action-icon-${tone}`}>{icon}</span>
                <span className="dash-action-body">
                  <span className="dash-action-line">{a.label}</span>
                  {a.sub && <span className="dash-action-sub">{a.sub}</span>}
                </span>
                <span className="dash-action-meta">
                  <span className="dash-action-meta-val">{a.meta || (a.action ? a.action : '')}</span>
                  {a.metaLabel && <span className="dash-action-meta-lab">{a.metaLabel}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* Promote a few raw suggested_actions to richer cards, and synthesise extra
   entries when the live data has enough signal to be useful. */
function enrichActions(actions, slots) {
  const list = (actions || []).slice(0, 4).map((a) => ({ ...a }));

  // Synthesise a "hire X for delivery Y" entry from the most under-filled slot.
  const worst = [...slots].sort((a, b) => (a.percent || 0) - (b.percent || 0))[0];
  if (worst && (worst.gap || 0) > 0) {
    list.unshift({
      type: 'gap',
      severity: 'high',
      label: `Hire ${worst.gap} for ${worst.delivery_id || 'pending request'}`,
      sub: `${worst.client || worst.campus || ''} · ${worst.course_name || worst.course || ''}`,
      meta: `+${worst.gap}`,
      metaLabel: 'OPEN',
      action: 'Go to Pending Allocations',
    });
  }

  // Synthesise a "close delivery" entry from a fully-filled but still open slot.
  const ready = slots.find((p) => (p.percent || 0) >= 99 && (p.status || '').toLowerCase() !== 'closed');
  if (ready) {
    list.push({
      type: 'ready',
      severity: 'low',
      label: `Close ${ready.delivery_id}`,
      sub: `${ready.client || ready.campus || ''} fully allocated`,
      meta: '100',
      metaLabel: '% READY',
      action: 'Go to Pending Allocations',
    });
  }

  // Always end with a "run capacity test" pointer to OASIS.
  list.push({
    type: 'capacity',
    severity: 'medium',
    label: 'Run capacity simulation',
    sub: `${slots.length} pending request${slots.length === 1 ? '' : 's'} in queue`,
    meta: 'Run',
    metaLabel: 'SIM',
    action: 'Open OASIS',
  });

  return list.slice(0, 5);
}
