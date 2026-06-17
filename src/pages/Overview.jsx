import {
  useGetKpisQuery,
  useGetPendingQuery,
  useGetConflictsQuery,
  useGetRequestTrackQuery,
} from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';

import KpiStrip            from '../components/dash/KpiStrip.jsx';
import DemandCapacityChart from '../components/dash/DemandCapacityChart.jsx';
import RiskDistribution    from '../components/dash/RiskDistribution.jsx';
import MonthlyMomentum     from '../components/dash/MonthlyMomentum.jsx';
import ActivePipeline      from '../components/dash/ActivePipeline.jsx';
import TrackCoverage       from '../components/dash/TrackCoverage.jsx';

/* ============================================================
   Dashboard — Trainer Capacity Planner
   ------------------------------------------------------------
   Analytical command-centre composed of:
     • KPI strip (5 headline numbers — single compact row)
     • Demand vs Capacity 30-day chart   (left)
     • Risk Distribution + Delivery Momentum trend  (right)
     • Active pipeline list + Track coverage heatmap (bottom)
   Every datum is live from RTK Query (kpis · pending · conflicts
   · request-track). No mock data.
   ============================================================ */

const navigateTo = (panel) => window.qlabs?.switchPanel?.(panel);

export default function Overview({ active }) {
  const kpisQ        = useGetKpisQuery();
  const pendingQ     = useGetPendingQuery();
  const conflictsQ   = useGetConflictsQuery();
  const requestTrack = useGetRequestTrackQuery({ limit: 500 });

  const loading = kpisQ.isLoading && !kpisQ.data;
  const error   = kpisQ.error || pendingQ.error;

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

  const kpis    = kpisQ.data || {};
  const pending = pendingQ.data || {};
  const rtRows  = requestTrack.data?.rows || [];

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="overview">
      {/* ----- KPI strip ----- */}
      <KpiStrip kpis={kpis} pending={pending} />

      {/* ----- Main 2-column: chart + (risk + momentum) ----- */}
      <div className="dash-main">
        <div className="dash-card dash-chart-card">
          <div className="dash-card-head">
            <div>
              <div className="dash-card-title">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6"  y1="20" x2="6"  y2="14" />
                </svg>
                DEMAND VS CAPACITY · 30-DAY OUTLOOK
              </div>
              <div className="dash-card-sub">
                Stacked trainer demand against rolling roster cap of <strong>{kpis.trainer_roster_count || 0}</strong> / day
              </div>
            </div>
          </div>
          <DemandCapacityChart
            data={kpis.demand_vs_capacity || []}
            onPickDay={() => navigateTo('requirements')}
          />
        </div>

        <div className="dash-side">
          <RiskDistribution pending={pending} onPick={() => navigateTo('pending')} />
          <MonthlyMomentum months={kpis.monthly_activity || []} />
        </div>
      </div>

      {/* ----- Bottom 2-column: pipeline + coverage ----- */}
      <div className="dash-bottom">
        <ActivePipeline rows={rtRows} onOpen={() => navigateTo('requirements')} />
        <TrackCoverage coverages={kpis.track_coverages || []} />
      </div>
    </section>
  );
}
