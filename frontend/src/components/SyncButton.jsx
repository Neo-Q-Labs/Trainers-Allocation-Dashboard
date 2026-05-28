import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { api, fetchHealth } from '../store/api.js';

/* ============================================================
   SyncButton
   ------------------------------------------------------------
   Self-contained Sync control — invalidates every RTK Query
   endpoint tagged 'sync' so each page refetches fresh data
   from the FastAPI /api/v1/* routes, which read from the live
   Trainer Data Live / Allotment Data Excel via Graph.

   The "Live · Ns ago" sub-label is sourced from the backend
   /health endpoint's `last_sync` field (the actual SharePoint
   pull timestamp), refreshed every 30 s so the relative time
   stays current without re-hitting the network.
   ============================================================ */

const fmtAgo = (iso) => {
  if (!iso) return '—';
  const last = new Date(iso).getTime();
  const diff = Math.max(0, Math.floor((Date.now() - last) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

export default function SyncButton() {
  const dispatch = useDispatch();
  const [syncing, setSyncing]   = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [, setTick]             = useState(0);
  const initialFetchedRef = useRef(false);

  // Initial last-sync timestamp on mount.
  useEffect(() => {
    if (initialFetchedRef.current) return;
    initialFetchedRef.current = true;
    fetchHealth()
      .then((h) => { if (h?.last_sync) setLastSync(h.last_sync); })
      .catch(() => { /* health is best-effort; the button still works */ });
  }, []);

  // Bump the "ago" label every 30 s.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      dispatch(api.util.invalidateTags(['sync']));
      const h = await fetchHealth().catch(() => null);
      if (h?.last_sync) setLastSync(h.last_sync);
    } finally {
      // Give the refetches a moment so the spinner doesn't blip.
      setTimeout(() => setSyncing(false), 600);
    }
  };

  return (
    <button
      type="button"
      className={`sync-btn${syncing ? ' is-syncing' : ''}`}
      onClick={handleSync}
      disabled={syncing}
      title="Pull fresh data from the live Excel sheet"
    >
      <svg
        viewBox="0 0 24 24" width="14" height="14"
        fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="sync-btn-icon"
      >
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
      <span className="sync-btn-label">{syncing ? 'Syncing…' : 'Sync'}</span>
      <span className="sync-btn-meta">
        <span className="sync-btn-dot" />
        Live · {fmtAgo(lastSync)}
      </span>
    </button>
  );
}
