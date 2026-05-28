import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { api, fetchHealth } from '../store/api.js';

/* ============================================================
   SyncButton
   ------------------------------------------------------------
   Self-contained Sync control — invalidates every RTK Query
   endpoint tagged 'sync' so each page refetches fresh data
   from the FastAPI /api/v1/* routes, which read from the live
   Trainer Data Live / Allotment Data Excel via Graph.

   Auto-sync cadence matches the backend POLL_INTERVAL_SECONDS
   (5 minutes per the deployment .env). The pill ticks every
   second so the relative "Live · Ns ago" and the countdown to
   the next pull stay accurate. When the countdown crosses 0
   we *actually* trigger a sync client-side instead of waiting
   for the backend's own scheduler — otherwise a stalled poll
   loop would leave the badge stuck at 00:00.
   ============================================================ */

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const HEALTH_REPOLL_MS = 60 * 1000;

const fmtAgo = (lastTs) => {
  if (!lastTs) return '—';
  const diff = Math.max(0, Math.floor((Date.now() - lastTs) / 1000));
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

const fmtCountdown = (lastTs) => {
  if (!lastTs) return '—';
  const next = lastTs + AUTO_SYNC_INTERVAL_MS;
  const remaining = Math.max(0, next - Date.now());
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function SyncButton() {
  const dispatch = useDispatch();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTs, setLastSyncTs] = useState(null);
  const [, setTick] = useState(0);
  const mountedRef = useRef(false);
  // Latest values exposed to the auto-fire timer without re-creating it.
  const syncingRef    = useRef(false);
  const lastSyncTsRef = useRef(null);
  useEffect(() => { syncingRef.current = syncing; }, [syncing]);
  useEffect(() => { lastSyncTsRef.current = lastSyncTs; }, [lastSyncTs]);

  // Stable sync handler — keeps the auto-fire timer effect from re-mounting
  // on every render of the pill (which would never let the timer actually fire).
  const runSync = useCallback(async () => {
    if (syncingRef.current) return;
    setSyncing(true);
    try {
      dispatch(api.util.invalidateTags(['sync']));
      const h = await fetchHealth().catch(() => null);
      if (h?.last_sync) {
        const ts = new Date(h.last_sync).getTime();
        if (Number.isFinite(ts)) setLastSyncTs(ts);
        else setLastSyncTs(Date.now());
      } else {
        // /health unavailable → mark a local sync so the countdown resets.
        setLastSyncTs(Date.now());
      }
    } finally {
      setTimeout(() => setSyncing(false), 600);
    }
  }, [dispatch]);

  // Initial last-sync fetch, then re-fetch /health on a slow loop so the
  // pill reflects server-side auto-syncs we didn't trigger ourselves.
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const pull = () => {
      fetchHealth()
        .then((h) => {
          if (h?.last_sync) {
            const ts = new Date(h.last_sync).getTime();
            if (Number.isFinite(ts)) setLastSyncTs(ts);
          }
        })
        .catch(() => { /* health is best-effort */ });
    };
    pull();
    const id = setInterval(pull, HEALTH_REPOLL_MS);
    return () => clearInterval(id);
  }, []);

  // 1-second tick so the "ago" label and the countdown both stay live.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-fire: every time the last-sync timestamp changes, queue a one-shot
  // timer for the exact moment the countdown would hit 0. When it fires we
  // call runSync(), which either picks up a fresh `last_sync` from /health
  // or stamps Date.now() locally — either way the timestamp moves and the
  // next iteration schedules itself. A small buffer (250ms) ensures the
  // backend has a beat to roll over before we ask.
  useEffect(() => {
    if (lastSyncTs == null) return undefined;
    const dueAt = lastSyncTs + AUTO_SYNC_INTERVAL_MS;
    const delay = Math.max(0, dueAt - Date.now()) + 250;
    const id = setTimeout(() => { runSync(); }, delay);
    return () => clearTimeout(id);
  }, [lastSyncTs, runSync]);

  // Safety net: if for any reason lastSyncTs never gets set after the initial
  // /health pull (e.g. the endpoint returned no `last_sync`), seed it so the
  // auto-fire loop can establish itself.
  useEffect(() => {
    if (lastSyncTs != null) return undefined;
    const id = setTimeout(() => {
      if (lastSyncTsRef.current == null) setLastSyncTs(Date.now());
    }, 5000);
    return () => clearTimeout(id);
  }, [lastSyncTs]);

  return (
    <div className="sync-cluster">
      <div className="sync-countdown" title="Time until next auto-sync">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="sync-countdown-label">Next Sync</span>
        <span className="sync-countdown-value">{fmtCountdown(lastSyncTs)}</span>
      </div>
      <button
        type="button"
        className={`sync-btn${syncing ? ' is-syncing' : ''}`}
        onClick={runSync}
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
          Live · {fmtAgo(lastSyncTs)}
        </span>
      </button>
    </div>
  );
}
