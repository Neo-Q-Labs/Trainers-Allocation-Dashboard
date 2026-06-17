/**
 * Centralized API client for the Trainer Allocation Dashboard.
 * All fetch calls go through apiFetch() so the base URL is a single
 * source of truth and error handling is consistent.
 */

const API_BASE = "http://localhost:8000/api/v1";

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API ${res.status} on ${path}`);
  }
  return res.json();
}

/** GET /api/v1/kpis — Overview KPI strip */
export const fetchKpis = () => apiFetch("/kpis");

/**
 * GET /api/v1/deliveries — Requirements pipeline table.
 * @param {Object} params  Optional query params: { status, campus, limit, offset }
 */
export const fetchRequirements = (params = {}) => {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
  ).toString();
  return apiFetch(`/deliveries${q ? "?" + q : ""}`);
};

/** GET /api/v1/pending-allocations — Pending allocation cards */
export const fetchPending = () => apiFetch("/pending-allocations");

/** GET /api/v1/conflicts — Conflict cards + kpi_summary + prone_days */
export const fetchConflicts = () => apiFetch("/conflicts");

/** GET /api/v1/workload — Workload KPIs + top-loaded + under-utilised lanes */
export const fetchWorkload = () => apiFetch("/workload");

/** GET /api/v1/clients — Client snapshot cards + KPIs */
export const fetchClients = () => apiFetch("/clients");

/**
 * GET /api/v1/availability — Trainer availability grid.
 * @param {number} days  Number of forward days to show (default 30)
 */
export const fetchAvailability = (days = 30) =>
  apiFetch(`/availability?days=${days}`);

/** GET /api/v1/calendar-metrics — Calendar panel KPI strip */
export const fetchCalendarMetrics = () => apiFetch("/calendar-metrics");

/**
 * GET /api/v1/calendar-data — Calendar events and demand data
 * @param {number} year - Year to fetch data for
 * @param {number} month - Month to fetch (1-12), optional
 */
export const fetchCalendarData = (year = 2026, month = null) => {
  const params = new URLSearchParams({ year: year.toString() });
  if (month !== null) {
    params.append('month', month.toString());
  }
  return apiFetch(`/calendar-data?${params.toString()}`);
};

/**
 * GET /api/v1/calendar-week — Detailed week data
 * @param {string} date - ISO date string (YYYY-MM-DD)
 */
export const fetchCalendarWeek = (date) => {
  const params = new URLSearchParams({ date });
  return apiFetch(`/calendar-week?${params.toString()}`);
};

/**
 * GET /api/v1/calendar-gantt — Trainer gantt data
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {number} days - Number of days to show
 */
export const fetchCalendarGantt = (startDate, days = 28) => {
  const params = new URLSearchParams({ 
    start_date: startDate,
    days: days.toString()
  });
  return apiFetch(`/calendar-gantt?${params.toString()}`);
};

/**
 * GET /api/v1/trainers — Trainer roster from Trainer Data Live sheet.
 * @param {Object} params  Optional: { campus, status, search, limit, offset }
 */
export const fetchTrainers = (params = {}) => {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
  ).toString();
  return apiFetch(`/trainers${q ? "?" + q : ""}`);
};

/** GET /api/v1/master-data — Master Data sheet */
export const fetchMasterData = () => apiFetch("/master-data");

/**
 * GET /api/v1/request-track — Request ID Track sheet.
 * @param {Object} params  Optional: { search, limit, offset }
 */
export const fetchRequestTrack = (params = {}) => {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
  ).toString();
  return apiFetch(`/request-track${q ? "?" + q : ""}`);
};

/**
 * GET /api/v1/date-blocking — Per-day deployed + available capacity grouped by
 * trainer category (FT / SME / WILP / FREELANCER).
 * @param {string} startDate  ISO YYYY-MM-DD (inclusive)
 * @param {string} endDate    ISO YYYY-MM-DD (inclusive)
 */
export const fetchDateBlocking = (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  const qs = params.toString();
  return apiFetch(`/date-blocking${qs ? "?" + qs : ""}`);
};

/**
 * GET /api/v1/availability-for-date — Fresh availability list for a single date.
 * Reads the latest Trainer Data Live snapshot.
 * @param {string} date  ISO YYYY-MM-DD
 */
export const fetchAvailabilityForDate = (date) =>
  apiFetch(`/availability-for-date?date=${encodeURIComponent(date)}`);

/**
 * POST /api/v1/simulate-requirement — Find trainers available for the full
 * requested date range AND matching the requested tech stack.
 * @param {Object} payload  { client, tech_stack, start_date, end_date, demand }
 */
export const simulateRequirement = async (payload) => {
  const res = await fetch(`${API_BASE}/simulate-requirement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`API ${res.status} on /simulate-requirement`);
  }
  return res.json();
};

/** GET /health — Backend health check */
export const fetchHealth = () =>
  fetch("http://localhost:8000/health").then((r) => r.json());

