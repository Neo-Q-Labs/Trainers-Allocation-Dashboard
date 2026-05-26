import { PANEL_META } from '../data/navigation.js';

export default function PageHead({ activePanel, onNewRequirement }) {
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
        <button className="btn-ghost">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={(e) => {
            e.stopPropagation();
            onNewRequirement?.();
          }}
        >
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
