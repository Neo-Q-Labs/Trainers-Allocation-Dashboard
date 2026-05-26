/**
 * PanelState.jsx — Shared loading and error states for all dashboard panels.
 * Pages initialize with null state and render these until the API responds.
 */

export function LoadingPanel({ panelId, active }) {
  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel={panelId}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '320px',
          gap: '18px',
          color: 'var(--text-muted)',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '2.5px solid var(--border, #2a2a3a)',
            borderTopColor: 'var(--accent-text, #6366f1)',
            borderRadius: '50%',
            animation: 'panel-spin 0.75s linear infinite',
          }}
        />
        <span style={{ fontSize: '13px', letterSpacing: '0.04em' }}>
          Loading from live Excel…
        </span>
        <style>{`
          @keyframes panel-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </section>
  );
}

export function ErrorPanel({ panelId, active, error, onRetry }) {
  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel={panelId}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '320px',
          gap: '12px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          padding: '32px',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: '40px', height: '40px', color: 'var(--neon-red, #ef4444)', stroke: 'currentColor' }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary, #a0a0b0)' }}>
          Unable to load data
        </div>
        <div style={{ fontSize: '12px', maxWidth: '400px', lineHeight: 1.6 }}>
          {error || 'Could not reach the backend API.'}<br />
          <span style={{ opacity: 0.7 }}>Ensure FastAPI is running on localhost:8000</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              marginTop: '8px',
              padding: '7px 18px',
              fontSize: '12px',
              fontWeight: 700,
              background: 'var(--accent, #6366f1)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        )}
      </div>
    </section>
  );
}
