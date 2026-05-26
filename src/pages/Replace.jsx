import { useState, useEffect, useCallback } from 'react';
import { fetchConflicts } from '../lib/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';

/**
 * Replacement Engine — derives replacement cases from live conflicts.
 * Each double-booking conflict becomes a candidate replacement case.
 * Full AI swap-chain generation is a future enhancement.
 */

function mapConflictToCase(c, idx) {
  const d1 = c.delivery_ids?.[0] || 'DEL-?';
  const d2 = c.delivery_ids?.[1] || 'DEL-?';
  const camp1 = c.campuses?.[0] || 'Unknown';
  const camp2 = c.campuses?.[1] || camp1;
  return {
    id: idx + 1,
    caseNum: `#${String(idx + 1).padStart(3, '0')}`,
    severity: c.severity === 'high' ? 'Critical — Double Booking' : 'Warning',
    severityClass: c.severity === 'high' ? '' : 'warn',
    trainer: c.trainer,
    date: c.date,
    d1,
    d2,
    camp1,
    camp2,
    message: c.message,
  };
}

export default function Replace({ active }) {
  const [cases, setCases] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    fetchConflicts()
      .then((data) => {
        const mapped = (data.conflicts ?? []).slice(0, 5).map(mapConflictToCase);
        setCases(mapped);
      })
      .catch((err) => setError(err.message || 'Unknown error'));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorPanel panelId="replace" active={active} error={error} onRetry={load} />;
  if (!cases) return <LoadingPanel panelId="replace" active={active} />;

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="replace">
      <div className="callout" style={{ marginBottom: '18px' }}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <div className="callout-title">How this works</div>
        <div className="callout-body">
          The Replacement Engine looks at every trainer whose schedule is in trouble and proposes the smallest
          possible swap.{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            Each case shows you the <em>trigger</em> (why the swap is needed), the <em>swap chain</em> (who moves
            where), and the <em>net impact</em> (what changes for the team).
          </strong>{' '}
          Accept it, override it, or escalate.
        </div>
      </div>

      {/* Active replacement cases derived from live conflicts */}
      <div className="replace-cases">
        {cases.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              padding: '48px',
              border: '1px dashed var(--border)',
              borderRadius: '12px',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: '40px', height: '40px', margin: '0 auto 12px', display: 'block', opacity: 0.4, stroke: 'currentColor' }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              No replacement cases needed
            </div>
            <div style={{ fontSize: '12px', marginTop: '6px' }}>
              All trainers are free of scheduling conflicts.
            </div>
          </div>
        )}

        {cases.map((rc) => (
          <div key={rc.id} className={`rc-case ${rc.severityClass}`}>
            <div className="rc-header">
              <div className="rc-num">{rc.caseNum}</div>
              <div className={`rc-status ${rc.severityClass === 'warn' ? 'warn' : ''}`}>
                <span className="rc-dot"></span>
                {rc.severity}
              </div>
            </div>

            <div className="rc-grid">
              {/* Trigger */}
              <div className="rc-step rc-trigger">
                <div className="rc-step-head">
                  <div className="rc-step-icon">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div className="rc-step-label">TRIGGER · Why we need a swap</div>
                </div>
                <div className="rc-step-body">
                  <div className="rc-line">
                    <strong>{rc.trainer}</strong> is double-booked between{' '}
                    <strong>{rc.d1}</strong> ({rc.camp1}) and <strong>{rc.d2}</strong> ({rc.camp2}) on{' '}
                    <strong>{rc.date}</strong>.
                  </div>
                  <div className="rc-meta">
                    <span className="meta-pair"><span className="lab">Delivery 1</span>{rc.d1}</span>
                    <span className="meta-pair"><span className="lab">Delivery 2</span>{rc.d2}</span>
                    <span className="meta-pair"><span className="lab">Date</span>{rc.date}</span>
                  </div>
                </div>
              </div>

              <div className="rc-arrow">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="5 12 19 12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>

              {/* Swap chain — requires AI matching layer */}
              <div className="rc-step rc-chain">
                <div className="rc-step-head">
                  <div className="rc-step-icon">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 0 0-15-6.7L3 8" />
                      <path d="M3 4v4h4" />
                      <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" />
                      <path d="M21 20v-4h-4" />
                    </svg>
                  </div>
                  <div className="rc-step-label">SWAP CHAIN · Proposed resolution</div>
                </div>
                <div className="rc-step-body">
                  <div className="rc-line" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    AI matching layer required to generate swap chain.
                    Use the Pending panel to manually assign a replacement trainer for{' '}
                    <strong style={{ color: 'var(--text-secondary)' }}>{rc.d2}</strong>.
                  </div>
                </div>
              </div>

              <div className="rc-arrow">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="5 12 19 12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>

              {/* Net impact */}
              <div className="rc-step rc-impact">
                <div className="rc-step-head">
                  <div className="rc-step-icon">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </div>
                  <div className="rc-step-label">NET IMPACT · What changes</div>
                </div>
                <div className="rc-step-body">
                  <div className="impact-row">
                    <span className="il">Conflict</span>
                    <span className="iv warn">Double booking resolved</span>
                  </div>
                  <div className="impact-row">
                    <span className="il">Trainer</span>
                    <span className="iv">{rc.trainer} freed from overlap</span>
                  </div>
                  <div className="impact-row">
                    <span className="il">Deliveries</span>
                    <span className="iv ok">{rc.d1} + {rc.d2} both covered</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rc-actions">
              <button className="btn-primary cc-btn">Accept Swap</button>
              <button className="btn-ghost cc-btn">Override</button>
              <button className="btn-ghost cc-btn">Escalate</button>
              <span className="rc-meta-right">Derived from live conflict data</span>
            </div>
          </div>
        ))}
      </div>

      {/* Swap history — empty state (requires history tracking layer) */}
      <div className="card" style={{ marginTop: '18px' }}>
        <div className="section-head">
          <div>
            <div className="section-title">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Swap History · last 48h
            </div>
            <div className="section-sub" style={{ marginTop: '6px' }}>
              Every replacement that's been accepted, with full audit trail
            </div>
          </div>
        </div>
        <div className="swap-log">
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '16px 0' }}>
            No swap history yet — history is recorded once the resolution tracking layer is active.
          </div>
        </div>
      </div>
    </section>
  );
}
