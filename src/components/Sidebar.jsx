import { NAV_ITEMS } from '../data/navigation.js';

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export default function Sidebar({ activePanel, onNavigate, onOpenCmdk }) {
  return (
    <aside className="sidebar">
      <div className="logo" title="QLabs">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" fill="rgba(255,255,255,0.15)" />
        </svg>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item, idx) =>
          item.divider ? (
            <div key={`d${idx}`} className="nav-divider" />
          ) : (
            <div
              key={item.target}
              className={`nav-item${activePanel === item.target ? ' active' : ''}`}
              data-target={item.target}
              data-tip={item.tip}
              onClick={() => onNavigate(item.target)}
            >
              {item.badge && <span className="nav-badge">{item.badge}</span>}
              <span dangerouslySetInnerHTML={{ __html: item.icon }} />
            </div>
          )
        )}
      </nav>

      <div className="sidebar-bottom">
        <div
          className="nav-item search-trigger"
          data-tip="Search · ⌘ K"
          id="cmdkTrigger"
          onClick={onOpenCmdk}
        >
          <Icon>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </Icon>
        </div>
        <div className="nav-item" data-tip="Settings">
          <Icon>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </Icon>
        </div>
        <div className="avatar-mini" data-tip="Karan Dharmalingam · neo10265">KD</div>
      </div>
    </aside>
  );
}
