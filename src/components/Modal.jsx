import { useEffect, useRef } from 'react';

export default function Modal() {
  const panelRef = useRef(null);
  // Native handler so clicks inside the panel stop propagation BEFORE the
  // legacy backdrop listener (attached via addEventListener) sees them.
  useEffect(() => {
    const stop = (e) => e.stopPropagation();
    panelRef.current?.addEventListener('click', stop);
    return () => panelRef.current?.removeEventListener('click', stop);
  }, []);

  return (
    <div className="modal-backdrop" id="modalBackdrop">
      <div className="modal-panel" ref={panelRef}>
        <div className="modal-head">
          <div className="ic" id="modalIcon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div className="tt" id="modalTitle">
              Title
            </div>
            <div className="sub" id="modalSubtitle">
              Subtitle
            </div>
          </div>
          <button className="modal-close" id="modalClose">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-body" id="modalBody" />
        <div className="modal-foot" id="modalFoot" />
      </div>
    </div>
  );
}
