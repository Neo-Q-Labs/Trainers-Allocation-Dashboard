import SyncButton from './SyncButton.jsx';

export default function PageHead({ activePanel, onNewRequirement }) {
  return (
    <div className="page-head">
      <div className="page-head-right">
        <SyncButton />
        {/* Export + New Requirement are only relevant on the Requirement page */}
        {activePanel === 'requirements' && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
