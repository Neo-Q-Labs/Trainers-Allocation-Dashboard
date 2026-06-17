import { useMemo } from 'react';

/* ============================================================
   Tile G · Top Clients
   ------------------------------------------------------------
   Horizontal bars, top 10 clients by trainer-days committed
   within the active date range. Click → ClientModal with
   delivery + trainer drill-down.
   ============================================================ */
export default function TopClientsBar({ days = [], onPick, skillFilter }) {
  const ranked = useMemo(() => {
    const map = new Map();
    for (const d of days) {
      for (const o of (d.occupied || [])) {
        if (skillFilter && skillFilter.type && o.type !== skillFilter.type) continue;
        const client = (o.client || '').trim();
        if (!client) continue;
        map.set(client, (map.get(client) || 0) + 1);
      }
    }
    const arr = Array.from(map.entries()).map(([client, days]) => ({ client, days }));
    arr.sort((a, b) => b.days - a.days);
    return arr.slice(0, 10);
  }, [days, skillFilter]);

  if (ranked.length === 0) {
    return <div className="tcp-empty-tile">No client engagements in this range.</div>;
  }

  const max = ranked[0].days;

  return (
    <div className="tcp-clients">
      <div className="tcp-clients-list">
        {ranked.map((r) => {
          const pct = (r.days / max) * 100;
          return (
            <button
              key={r.client}
              type="button"
              className="tcp-clients-row"
              onClick={() => onPick?.(r.client)}
              title={`${r.client} · ${r.days} trainer-day${r.days === 1 ? '' : 's'} · click for delivery breakdown`}
            >
              <span className="tcp-clients-name" title={r.client}>{r.client}</span>
              <span className="tcp-clients-bar">
                <span className="tcp-clients-bar-fill" style={{ width: `${pct}%` }} />
              </span>
              <span className="tcp-clients-count">{r.days}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
