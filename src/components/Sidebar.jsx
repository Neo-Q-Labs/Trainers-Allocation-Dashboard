import { useMemo } from 'react';
import { NAV_ITEMS } from '../data/navigation.js';
import { useGetRequestTrackQuery } from '../store/api.js';
import { countPending } from '../lib/allocation.js';

/** Live badge overrides. Any target listed here uses the computed value
 *  instead of the static badge from navigation.js. */
function useLiveBadges() {
  // Same query the Pending page uses — cache is shared, no extra network.
  const { data: rtData } = useGetRequestTrackQuery({ limit: 500 });
  return useMemo(() => ({
    pending: countPending(rtData),
  }), [rtData]);
}

export default function Sidebar({ activePanel, onNavigate, onOpenCmdk }) {
  const liveBadges = useLiveBadges();
  return (
    <aside className="sidebar">
      <div className="logo" title="QLabs">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" fill="rgba(255,255,255,0.15)" />
        </svg>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item, idx) => {
          if (item.divider) {
            return <div key={`d${idx}`} className="nav-divider" />;
          }
          // Pending uses the live computed count; other badges stay static
          // until they're wired to live data too.
          const badge = liveBadges[item.target] != null
            ? liveBadges[item.target]
            : item.badge;
          return (
            <div
              key={item.target}
              className={`nav-item${activePanel === item.target ? ' active' : ''}`}
              data-target={item.target}
              data-tip={item.tip}
              onClick={() => onNavigate(item.target)}
            >
              {badge ? <span className="nav-badge">{badge}</span> : null}
              <span dangerouslySetInnerHTML={{ __html: item.icon }} />
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
