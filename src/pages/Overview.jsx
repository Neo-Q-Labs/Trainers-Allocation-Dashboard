import { useMemo, useState } from 'react';
import {
  useGetKpisQuery,
  useGetPendingQuery,
  useGetRequestTrackQuery,
} from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';
import DateRangeFilter from '../components/DateRangeFilter.jsx';

import KpiStrip            from '../components/dash/KpiStrip.jsx';
import DemandCapacityChart from '../components/dash/DemandCapacityChart.jsx';
import ActivePipeline      from '../components/dash/ActivePipeline.jsx';
import TrackCoverage       from '../components/dash/TrackCoverage.jsx';

/* ============================================================
   Dashboard — Trainer Capacity Planner
   ------------------------------------------------------------
   Analytical command-centre composed of:
     • Date-range filter (Start / End + Apply / Reset)
     • KPI strip (4 headline numbers — single compact row)
     • Demand vs Capacity chart (scoped to the selected range)
     • Active pipeline list + Track coverage heatmap (bottom)
   Every datum is live from RTK Query (kpis · pending ·
   request-track). No mock data.
   ============================================================ */

const navigateTo = (panel) => window.qlabs?.switchPanel?.(panel);

const toIso = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

export default function Overview({ active }) {
  const kpisQ        = useGetKpisQuery();
  const pendingQ     = useGetPendingQuery();
  const requestTrack = useGetRequestTrackQuery({ limit: 500 });

  // ----- Date-range filter (drives the chart + pipeline) -----
  const today = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => toIso(today), [today]);
  const defaultEnd   = useMemo(
    () => toIso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 29)),
    [today],
  );
  const [rangeStart, setRangeStart] = useState(defaultStart);
  const [rangeEnd,   setRangeEnd]   = useState(defaultEnd);

  const loading = kpisQ.isLoading && !kpisQ.data;
  const error   = kpisQ.error || pendingQ.error;

  const kpis    = kpisQ.data || {};
  const pending = pendingQ.data || {};
  const rtRows  = requestTrack.data?.rows || [];

  // Chart data scoped to the committed range (ISO compares lexicographically).
  const chartData = useMemo(() => {
    const all = kpis.demand_vs_capacity || [];
    return all.filter((d) => d.date >= rangeStart && d.date <= rangeEnd);
  }, [kpis.demand_vs_capacity, rangeStart, rangeEnd]);

  if (error) {
    return (
      <ErrorPanel
        panelId="overview"
        active={active}
        error={error?.error || error?.message || 'Failed to load dashboard data.'}
        onRetry={() => kpisQ.refetch()}
      />
    );
  }
  if (loading) return <LoadingPanel panelId="overview" active={active} />;

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="overview">
      {/* ----- Date-range filter ----- */}
      <div className="dash-toolbar">
        <DateRangeFilter
          start={rangeStart} end={rangeEnd}
          defaultStart={defaultStart} defaultEnd={defaultEnd}
          onApply={(s, e) => { setRangeStart(s); setRangeEnd(e); }}
        />
      </div>

      {/* ----- KPI strip ----- */}
      <KpiStrip kpis={kpis} pending={pending} />

      {/* ----- Demand vs Capacity chart (scoped to range) ----- */}
      <div className="dash-card dash-chart-card dash-chart-full">
        <div className="dash-card-head">
          <div>
            <div className="dash-card-title">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6"  y1="20" x2="6"  y2="14" />
              </svg>
              DEMAND VS CAPACITY · {chartData.length}-DAY OUTLOOK
            </div>
            <div className="dash-card-sub">
              Stacked trainer demand against rolling roster cap of <strong>{kpis.trainer_roster_count || 0}</strong> / day
            </div>
          </div>
        </div>
        <DemandCapacityChart
          data={chartData}
          onPickDay={() => navigateTo('requirements')}
        />
      </div>

      {/* ----- Bottom 2-column: pipeline + coverage ----- */}
      <div className="dash-bottom">
        <ActivePipeline rows={rtRows} rangeStart={rangeStart} rangeEnd={rangeEnd} onOpen={() => navigateTo('requirements')} />
        <TrackCoverage coverages={kpis.track_coverages || []} />
      </div>
    </section>
  );
}
