import { PANEL_META } from '../data/navigation.js';

export default function PageHead({ activePanel, onOpenCmdk }) {
  const meta = PANEL_META[activePanel] || PANEL_META.overview;
  return (
    <div className="page-head">
      <div className="page-head-left">
        <div className="page-icon" id="pageIcon" dangerouslySetInnerHTML={{ __html: meta.icon }} />
        <div className="page-title-block">
          <div className="breadcrumb" id="breadcrumb">
            {meta.crumb}
          </div>
          <div className="title" id="pageTitle">
            {meta.title}
          </div>
        </div>
      </div>
      <div className="page-head-right">
        <div className="range-segment">
          <button>7D</button>
          <button className="active">1M</button>
          <button>3M</button>
          <button>FY27</button>
        </div>
        <button className="btn-ghost" id="cmdkTriggerBtn" onClick={onOpenCmdk}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          Search
          <span className="kbd-inline">⌘K</span>
        </button>
        <button className="btn-ghost">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
        <button className="btn-primary">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Requirement
        </button>
      </div>
    </div>
  );
}
