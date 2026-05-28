import { useMemo, useState, useEffect } from 'react';
import { NAV_ITEMS } from '../data/navigation.js';
import { useGetRequestTrackQuery } from '../store/api.js';
import { countPending } from '../lib/allocation.js';

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);
  return [theme, setTheme];
}

/** Live badge overrides. Any target listed here uses the computed value
 *  instead of the static badge from navigation.js. */
function useLiveBadges() {
  // Same query the Pending page uses — cache is shared, no extra network.
  const { data: rtData } = useGetRequestTrackQuery({ limit: 500 });
  return useMemo(() => ({
    pending: countPending(rtData),
  }), [rtData]);
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Sidebar({ user, activePanel, onNavigate, onOpenCmdk }) {
  const liveBadges = useLiveBadges();
  const [theme, setTheme] = useTheme();
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



      {/* Bottom Profile Avatar and Logout Actions */}
      <div className="sidebar-bottom" style={{ marginBottom: '16px' }}>
        {/* Theme toggle (dark ↔ light) */}
        <div
          className="nav-item nav-theme"
          data-tip={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle theme"
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px', stroke: 'currentColor' }}>
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px', stroke: 'currentColor' }}>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          )}
        </div>
        {/* Premium Secure Logout button */}
        <div
          className="nav-item nav-logout"
          data-tip="Secure Logout"
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.dispatchEvent(new Event('auth-logout'));
            if (window.showToast) {
              window.showToast('Secure Logout', 'You have been successfully logged out.', 'ok');
            }
          }}
          style={{
            color: 'var(--neon-red, #ff4444)',
            filter: 'drop-shadow(0 0 8px rgba(255, 68, 68, 0.15))'
          }}
          title="Secure Logout"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px', stroke: 'currentColor' }}>
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
            <line x1="12" y1="2" x2="12" y2="12" />
          </svg>
        </div>
      </div>
    </aside>

  );
}
