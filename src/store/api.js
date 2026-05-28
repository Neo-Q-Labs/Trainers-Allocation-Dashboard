import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/* ============================================================
   Central RTK Query API slice
   ------------------------------------------------------------
   Every backend endpoint the UI consumes lives here. RTK Query
   caches responses by argument, so navigating between pages
   reuses the cached payload instantly. The Sync button in the
   Topbar invalidates the shared 'sync' tag, which triggers a
   single coordinated refetch of every endpoint that has it as
   a providesTags entry — pulling fresh data from the live
   Trainer Data Live / Allotment Data Excel via the FastAPI
   /api/v1/* routes.
   ============================================================ */

const API_ROOT = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_BASE = `${API_ROOT}/api/v1`;

// Default: keep cached data for an hour so cross-page navigation never
// triggers a refetch on its own. Refetch happens only when the user clicks
// Sync or when a query is explicitly invalidated.
const ONE_HOUR = 60 * 60;

// Helper: turn an optional params object into a query string, dropping nulls.
const qs = (params = {}) => {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '');
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(Object.fromEntries(entries)).toString();
};

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  const isGet = !args.method || args.method.toUpperCase() === 'GET';
  const urlPath = typeof args === 'string' ? args : args.url;
  const cacheKey = isGet ? `offline_cache:${urlPath}:${JSON.stringify(typeof args === 'string' ? {} : args.params || {})}` : null;

  let result = await baseQuery(args, api, extraOptions);

  if (result.error) {
    if (result.error.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-logout'));
    } else if (isGet && (result.error.status === 'FETCH_ERROR' || typeof result.error.status !== 'number' || result.error.status >= 500)) {
      // Backend is offline, unreachable, or crashed.
      window.dispatchEvent(new CustomEvent('backend-offline', { detail: { url: urlPath } }));
      
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          console.warn(`[Offline Cache] Backend unreachable. Serving cached data for: ${urlPath}`);
          return { data: JSON.parse(cached) };
        }
      } catch (e) {
        console.error('[Offline Cache] Failed to parse cached data', e);
      }
    }
  } else if (isGet && result.data) {
    // Successful GET query — update the offline cache and trigger online event
    window.dispatchEvent(new CustomEvent('backend-online'));
    try {
      localStorage.setItem(cacheKey, JSON.stringify(result.data));
    } catch (e) {
      console.error('[Offline Cache] Failed to save to localStorage', e);
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,

  // Single shared tag — the Sync button invalidates this and every
  // endpoint below refetches. Individual endpoints can still be
  // invalidated/refetched on their own via their own tag.
  tagTypes: ['sync', 'date-blocking', 'availability', 'trainers', 'deliveries',
             'conflicts', 'kpis', 'pending', 'workload', 'clients',
             'calendar', 'calendar-metrics', 'request-track', 'master-data',
             'health', 'oasis-options'],
  keepUnusedDataFor: ONE_HOUR,
  refetchOnMountOrArgChange: false,
  refetchOnFocus: false,
  refetchOnReconnect: false,
  endpoints: (build) => ({
    // ---- Auth ----
    login: build.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    getMe: build.query({
      query: () => '/auth/me',
      providesTags: ['sync'],
    }),

    // ---- Overview / Date-Wise Blocking ----
    getDateBlocking: build.query({
      query: ({ start_date, end_date } = {}) =>
        `/date-blocking${qs({ start_date, end_date })}`,
      providesTags: ['sync', 'date-blocking'],
    }),
    getAvailabilityForDate: build.query({
      query: (date) => `/availability-for-date${qs({ date })}`,
      providesTags: (_r, _e, date) => [
        'sync', 'availability', { type: 'availability', id: date },
      ],
    }),

    // ---- Simulator (mutation: doesn't get cached the same way) ----
    simulateRequirement: build.mutation({
      query: (body) => ({
        url: '/simulate-requirement',
        method: 'POST',
        body,
      }),
    }),

    // ---- OASIS · Opportunity Assessment ----
    // Vocabulary for the OASIS form dropdowns (clients + primary tracks),
    // sourced from Request ID Track + Trainer Data Live.
    getOasisOptions: build.query({
      query: () => '/oasis/options',
      providesTags: ['sync', 'oasis-options'],
    }),
    // Full assessment — returns ranked candidates + bucket counts.
    assessOpportunity: build.mutation({
      query: (body) => ({
        url: '/oasis/assess',
        method: 'POST',
        body,
      }),
    }),

    // ---- Roster / Trainers ----
    getTrainers: build.query({
      query: (params = {}) => `/trainers${qs(params)}`,
      providesTags: ['sync', 'trainers'],
    }),

    // ---- Pipeline / Deliveries ----
    getDeliveries: build.query({
      query: (params = {}) => `/deliveries${qs(params)}`,
      providesTags: ['sync', 'deliveries'],
    }),

    // ---- KPI strip / dashboard ----
    getKpis: build.query({
      query: () => '/kpis',
      providesTags: ['sync', 'kpis'],
    }),

    // ---- Conflicts ----
    getConflicts: build.query({
      query: () => '/conflicts',
      providesTags: ['sync', 'conflicts'],
    }),

    // ---- Pending allocations ----
    getPending: build.query({
      query: () => '/pending-allocations',
      providesTags: ['sync', 'pending'],
    }),

    // ---- Workload ----
    getWorkload: build.query({
      query: () => '/workload',
      providesTags: ['sync', 'workload'],
    }),

    // ---- Clients ----
    getClients: build.query({
      query: () => '/clients',
      providesTags: ['sync', 'clients'],
    }),

    // ---- Calendar ----
    getCalendarMetrics: build.query({
      query: () => '/calendar-metrics',
      providesTags: ['sync', 'calendar-metrics'],
    }),
    getCalendarData: build.query({
      query: ({ year, month } = {}) => `/calendar-data${qs({ year, month })}`,
      providesTags: ['sync', 'calendar'],
    }),
    getCalendarWeek: build.query({
      query: (date) => `/calendar-week${qs({ date })}`,
      providesTags: ['sync', 'calendar'],
    }),
    getCalendarGantt: build.query({
      query: ({ start_date, days = 28 } = {}) =>
        `/calendar-gantt${qs({ start_date, days })}`,
      providesTags: ['sync', 'calendar'],
    }),

    // ---- Misc reference sheets ----
    getMasterData: build.query({
      query: () => '/master-data',
      providesTags: ['sync', 'master-data'],
    }),
    getRequestTrack: build.query({
      query: (params = {}) => `/request-track${qs(params)}`,
      providesTags: ['sync', 'request-track'],
    }),

    // ---- Live availability grid (legacy) ----
    getAvailability: build.query({
      query: (days = 30) => `/availability${qs({ days })}`,
      providesTags: ['sync', 'availability'],
    }),
  }),
});

// ---- Hooks (auto-generated by RTK Query) ----
export const {
  useGetDateBlockingQuery,
  useGetAvailabilityForDateQuery,
  useSimulateRequirementMutation,
  useGetTrainersQuery,
  useGetDeliveriesQuery,
  useGetKpisQuery,
  useGetConflictsQuery,
  useGetPendingQuery,
  useGetWorkloadQuery,
  useGetClientsQuery,
  useGetCalendarMetricsQuery,
  useGetCalendarDataQuery,
  useGetCalendarWeekQuery,
  useGetCalendarGanttQuery,
  useGetMasterDataQuery,
  useGetRequestTrackQuery,
  useGetAvailabilityQuery,
  useGetOasisOptionsQuery,
  useAssessOpportunityMutation,
  useLoginMutation,
  useGetMeQuery,
} = api;

// One-shot health probe used by the Sync button to surface the live-sheet
// snapshot timestamp from the FastAPI backend.
export async function fetchHealth() {
  const res = await fetch(`${API_ROOT}/health`);
  if (!res.ok) throw new Error(`Health ${res.status}`);
  return res.json();
}
