const I = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export default function Popover() {
  return (
    <div className="popover" id="rowPopover">
      <div className="popover-item" data-pop="view">
        <I>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </I>
        View Details
      </div>
      <div className="popover-item" data-pop="edit">
        <I>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
        </I>
        Edit Requirement
      </div>
      <div className="popover-item" data-pop="allocate">
        <I>
          <circle cx="9" cy="7" r="4" />
          <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </I>
        Allocate Trainer
      </div>
      <div className="popover-item" data-pop="duplicate">
        <I>
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </I>
        Duplicate
      </div>
      <div className="popover-divider" />
      <div className="popover-item danger" data-pop="archive">
        <I>
          <polyline points="21 8 21 21 3 21 3 8" />
          <rect x="1" y="3" width="22" height="5" />
          <line x1="10" y1="12" x2="14" y2="12" />
        </I>
        Archive
      </div>
    </div>
  );
}
