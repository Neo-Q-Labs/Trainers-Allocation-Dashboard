import SyncButton from './SyncButton.jsx';

export default function PageHead({ activePanel, onNewRequirement }) {
  return (
    <div className="page-head">
      <div className="page-head-right">
        <SyncButton />
        {/* New Requirement is only relevant on the Requirement page (Export lives in the page header) */}
        {activePanel === 'requirements' && (
          <>
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
