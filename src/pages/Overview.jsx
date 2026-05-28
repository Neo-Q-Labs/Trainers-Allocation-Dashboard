import { useMemo, useState } from 'react';
import {
  useGetKpisQuery,
  useGetPendingQuery,
  useGetRequestTrackQuery,
} from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';
import DateRangeFilter from '../components/DateRangeFilter.jsx';
import ExportButton from '../components/ExportButton.jsx';
import { exportToExcel } from '../lib/exportExcel.js';

import KpiStrip            from '../components/dash/KpiStrip.jsx';
import DemandCapacityChart from '../components/dash/DemandCapacityChart.jsx';
import ActivePipeline      from '../components/dash/ActivePipeline.jsx';
import TrackCoverage       from '../components/dash/TrackCoverage.jsx';

/* ============================================================
   Dashboard — Trainer Allocation Dashboard
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

  // ---- Export handler: 3 sheets, deduped pipeline ----
  const handleExport = () => {
    const stamp = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // Sheet 1 – KPI Summary
    const kpiRows = [
      { metric: 'Total Trainers',          value: kpis.trainer_roster_count ?? '—' },
      { metric: 'Active Trainers',         value: kpis.active_trainers ?? '—' },
      { metric: 'Utilisation %',           value: kpis.utilisation_pct != null ? `${kpis.utilisation_pct}%` : '—' },
      { metric: 'Upcoming Deliveries',     value: kpis.upcoming_deliveries ?? '—' },
      { metric: 'Open Gaps',               value: pending.open_gaps ?? pending.total ?? '—' },
      { metric: 'Report Date',             value: stamp },
      { metric: 'Range Start',             value: rangeStart },
      { metric: 'Range End',               value: rangeEnd },
    ];

    // Sheet 2 – Demand vs Capacity (scoped to selected range)
    const demandRows = chartData.map((d) => ({
      date:     d.date,
      demand:   d.demand   ?? 0,
      capacity: d.capacity ?? 0,
      gap:      (d.capacity ?? 0) - (d.demand ?? 0),
    }));

    // Sheet 3 – Active Pipeline (deduped by Delivery ID)
    const seen = new Set();
    const pipelineRows = rtRows
      .filter((r) => {
        const id = String(r['Delivery ID'] || '').trim();
        if (!id) return false;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((r) => ({
        delivery_id:        String(r['Delivery ID']        || '').trim(),
        client:             String(r['Client Name']        || '').trim(),
        course:             String(r['Course']             || '').trim(),
        domain:             String(r['Domain']             || '').trim(),
        subdomain:          String(r['Subdomain']          || '').trim(),
        start_date:         String(r['Program Start Date'] || '').trim(),
        end_date:           String(r['Program End Date']   || '').trim(),
        allocation_status:  String(r['Allocation Status']  || '').trim(),
        training_status:    String(r['Training Status']    || '').trim(),
        trainer_required:   r['Total Trainer Required'] ?? '',
        ta_required:        r["Total TA's Required"]    ?? '',
        internal:           r['Internal']               ?? '',
        existing_fl:        r['Existing Freelancers']   ?? '',
        new_fl_hired:       r['New Freelancers Hired']  ?? '',
        new_fl_required:    r['New Freelancer Required']?? '',
        risk:               r['Risk']                   ?? '',
        trainer_planned:    r['Trainer planned']        ?? '',
        ta_planned:         r['TA Planned']             ?? '',
      }));

    exportToExcel({
      filename: 'dashboard',
      sheets: [
        {
          name: 'KPI Summary',
          columns: [
            { header: 'Metric', key: 'metric' },
            { header: 'Value',  key: 'value'  },
          ],
          rows: kpiRows,
        },
        {
          name: 'Demand vs Capacity',
          columns: [
            { header: 'Date',            key: 'date'     },
            { header: 'Trainer Demand',  key: 'demand'   },
            { header: 'Roster Capacity', key: 'capacity' },
            { header: 'Gap (Cap−Dem)',   key: 'gap'      },
          ],
          rows: demandRows,
        },
        {
          name: 'Active Pipeline',
          columns: [
            { header: 'Delivery ID',         key: 'delivery_id'       },
            { header: 'Client',              key: 'client'            },
            { header: 'Course',              key: 'course'            },
            { header: 'Domain',              key: 'domain'            },
            { header: 'Subdomain',           key: 'subdomain'         },
            { header: 'Start Date',          key: 'start_date'        },
            { header: 'End Date',            key: 'end_date'          },
            { header: 'Allocation Status',   key: 'allocation_status' },
            { header: 'Training Status',     key: 'training_status'   },
            { header: 'Trainers Required',   key: 'trainer_required'  },
            { header: 'TAs Required',        key: 'ta_required'       },
            { header: 'Internal',            key: 'internal'          },
            { header: 'Existing Freelancers',key: 'existing_fl'       },
            { header: 'New FL Hired',        key: 'new_fl_hired'      },
            { header: 'New FL Required',     key: 'new_fl_required'   },
            { header: 'Risk',                key: 'risk'              },
            { header: 'Trainers Planned',    key: 'trainer_planned'   },
            { header: 'TAs Planned',         key: 'ta_planned'        },
          ],
          rows: pipelineRows,
        },
      ],
    });
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ExportButton
            onClick={handleExport}
            disabled={!rtRows.length && !chartData.length}
            label="Export"
          />
        </div>
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
