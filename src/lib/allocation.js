/* ============================================================
   Shared allocation helpers
   ------------------------------------------------------------
   Used by both the Pending Allocations page and the Sidebar
   pending-badge so the count the user sees on the nav matches
   the count shown on the page exactly.

   Source: every row from /api/v1/request-track (Request ID
   Track sheet, live via Graph). A row is "pending" when the
   combined Internal + Freelancer headcount is below the
   Trainer + TA demand for that row.
   ============================================================ */

const parseNum = (v) => {
  if (v == null || v === '') return 0;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

/** Returns true if a request-track row still has a fulfilment gap. */
export function isRowPending(row) {
  if (!row) return false;
  const required =
    parseNum(row['Total Trainer Required']) +
    parseNum(row["Total TA's Required"]);
  if (required === 0) return false;
  const filled =
    parseNum(row['Internal']) +
    parseNum(row['Existing Freelancers']) +
    parseNum(row['New Freelancers Hired']);
  return filled < required;
}

/** Count of pending rows in a request-track payload. */
export function countPending(requestTrackData) {
  const rows = requestTrackData?.rows || [];
  return rows.reduce((n, r) => (isRowPending(r) ? n + 1 : n), 0);
}
