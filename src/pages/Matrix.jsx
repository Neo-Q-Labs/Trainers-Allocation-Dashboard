import { useState, useMemo, useRef, useEffect, memo, useCallback } from 'react';
import { useGetTrainersQuery, useGetRequestTrackQuery } from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';
import DateRangeFilter from '../components/DateRangeFilter.jsx';
import ExportButton from '../components/ExportButton.jsx';
import RequirementModal from '../components/RequirementModal.jsx';
import { buildRequirementRow } from '../lib/req.js';
import { exportToExcel } from '../lib/exportExcel.js';

/* ============================================================
   Trainer Matrix · Engagement Grid
   ------------------------------------------------------------
   Live allocation heatmap (trainer × day) sourced from Trainer
   Data Live (/api/v1/trainers). Each cell is reduced to one of
   exactly FOUR meaningful states for easy visual scanning:

     • Fully Occupied     — primary trainer on a delivery
     • Partially Occupied — TA / backup / supporting role
     • Holiday            — weekend (or no work scheduled)
     • Leave              — exit / on-leave

   (A free weekday shows as an empty base cell.)
   Track + Client chips and a search/status filter narrow the
   grid; a Trainer Directory snapshot summarises each trainer.
   ============================================================ */

const INTERNAL_TYPES = new Set(['FT', 'SME', 'WILP']);

const WINDOW_DAYS = 28;

const STOPWORDS = new Set([
  'the','and','for','of','to','with','in','on','by','trainer','trainers',
  'ta','tas','backup','training','course','program','phase','session','batch',
  'sem','revision','not','alloted','allocated','na','no','class','tbd','hold',
  'leave','exit','holiday','pending','new','old','using','based','live','demo',
]);

const toIso = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const initials = (name) => (name || '?')
  .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// free / exit / leave / ta / backup / trainer
// NOTE: "Exit" (off-boarded) is distinct from "Leave" / "On Leave" (temporary).
const classifyCell = (cell) => {
  const s = (cell || '').trim().toLowerCase();
  if (!s || s === 'not alloted' || s === 'not allocated' || s === 'na' || s === 'n/a') return 'free';
  if (s === 'exit' || s === 'exited' || s === 'left' || s === 'resigned') return 'exit';
  if (s === 'leave' || s === 'on leave' || s === 'on-leave' || s === 'onleave') return 'leave';
  if (s.endsWith('-ta') || s.endsWith(' ta') || s.includes(' ta ') || s.includes('internal ta')) return 'ta';
  if (s.includes('backup') || s.includes('back up') || s.includes('back-up')) return 'backup';
  return 'trainer';
};

// Sunday is the weekly week-off → its own distinct state.
const isWeekOff = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 0; // 0 = Sunday
};

// "No Class" / "Holiday" cells are explicit non-teaching days → Holiday.
const isNoClass = (cell) => {
  const s = (cell || '').trim().toLowerCase();
  return s.includes('no class') || s.includes('noclass') || s.includes('no-class') || s.includes('holiday');
};

// Reduce a (cell, date) to one of: full | partial | weekoff | holiday | leave | exit | free
const cellState = (cell, iso) => {
  if (isNoClass(cell)) return 'holiday';          // "No Class" / Holiday cell
  const kind = classifyCell(cell);
  if (kind === 'exit') return 'exit';             // off-boarded
  if (kind === 'leave') return 'leave';           // temporary leave
  if (kind === 'trainer') return 'full';
  if (kind === 'ta' || kind === 'backup') return 'partial';
  // free → Sunday = Week Off (distinct red), otherwise truly free (empty)
  return isWeekOff(iso) ? 'weekoff' : 'free';
};

const STATE_LABEL = {
  full:    'Fully Occupied',
  partial: 'Partially Occupied',
  weekoff: 'Week Off',
  holiday: 'No Class / Holiday',
  leave:   'Leave',
  free:    'Free',
};

// ---- Build allocation blocks from a trainer's schedule ----
// Groups consecutive same-programme cells into date ranges for the drawer.
function buildAllocationBlocks(schedule, days) {
  const blocks = [];
  let current = null;
  for (const d of days) {
    const cell = schedule[d.iso] || '';
    const st = cellState(cell, d.iso);
    if (st === 'full' || st === 'partial') {
      const { client, course } = parseAssignment(cell);
      const key = `${client}|${course}`;
      if (current && current.key === key) {
        current.endIso = d.iso;
        current.days += 1;
      } else {
        if (current) blocks.push(current);
        current = { key, client, course, role: st === 'partial' ? 'TA / Backup' : 'Trainer', startIso: d.iso, endIso: d.iso, days: 1, rawCell: cell };
      }
    } else {
      if (current) { blocks.push(current); current = null; }
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

// Parse "LTIM-MERN-Trainer" → { client: 'LTIM', course: 'MERN' }
const parseAssignment = (cell) => {
  const raw = (cell || '').trim();
  if (!raw) return { client: '', course: '' };
  let body = raw;
  const lower = raw.toLowerCase();
  for (const suffix of ['-trainer', '-trainers', '-ta', '-backup', '_trainer']) {
    if (lower.endsWith(suffix)) { body = raw.slice(0, -suffix.length); break; }
  }
  const parts = body.split('-').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { client: '', course: '' };
  if (parts.length === 1) return { client: '', course: parts[0] };
  return { client: parts[0], course: parts.slice(1).join(' ') };
};

const tokens = (text) => {
  if (!text) return [];
  return text.toLowerCase().replace(/[^\w\s]+/g, ' ').split(/\s+/)
    .filter((t) => t && t.length >= 2 && !STOPWORDS.has(t));
};

// ---- Curated TRACK taxonomy ----
// Raw course text in the sheet is messy ("MERN Batch 1", "No Class", "Java
// FS-Trainer"). We map it to a small set of clean, canonical tracks via
// keyword patterns so the filter chips read sensibly.
const TRACK_PATTERNS = [
  ['DSA',          /\b(dsa|data\s*struct|algorithm|problem\s*solving)\b/i],
  ['Java FS',      /\b(java\s*fs|java\s*full|jfs|mern|mean|spring\s*boot|j2ee)\b/i],
  ['.NET / Cloud', /(\.net|dotnet|\bnet\b|azure|\baws\b|\bgcp\b|cloud|devops|kubernetes)/i],
  ['Python / ML',  /\b(python|machine\s*learning|\bml\b|data\s*sci|gen\s*ai|genai|\bai\b|\bnlp\b)\b/i],
  ['Aptitude',     /\b(aptitude|quant|reasoning|verbal|soft\s*skill)\b/i],
  ['SAP',          /\b(sap|abap|hana|fico|s\/4)\b/i],
  ['Cyber / QA',   /\b(cyber|security|infosec|ethical|sdet|testing|\bqa\b|selenium)\b/i],
  ['Web / React',  /\b(react|angular|frontend|front\s*end|javascript|node|vue|html|css)\b/i],
  ['SQL / DB',     /\b(sql|database|mysql|oracle|plsql|mongo|postgres)\b/i],
  ['C / C++',      /\b(c\+\+|cpp|\bc\b\s*programming|c\s*language)\b/i],
];

const deriveTracks = (text) => {
  const out = [];
  if (!text) return out;
  for (const [name, re] of TRACK_PATTERNS) if (re.test(text)) out.push(name);
  return out;
};

// ---- Clean client code from a cell prefix ----
// Keep only short, code-like prefixes (e.g. "LTIM", "Parul", "SKG"); drop
// noisy descriptive prefixes ("Exam Reporting: VIT", phrases with spaces /
// colons / brackets) that aren't real clients.
const cleanClient = (raw) => {
  const s = (raw || '').trim();
  if (!s) return '';
  if (/[:[\]()]/.test(s)) return '';        // descriptive text, not a code
  if (/\s/.test(s)) return '';              // multi-word → not a client code
  if (s.length < 2 || s.length > 14) return '';
  if (!/[a-zA-Z]/.test(s)) return '';       // must contain letters
  return s;
};

const TYPE_LABEL = {
  FT: 'Internal · Fulltime', SME: 'Internal · SME', WILP: 'Internal · WILP', FREELANCER: 'Freelancer', EXIT: 'Exited',
};

// Pool dropdown options (active resources only — Exit lives in its own tab).
const POOLS = [
  { id: 'all',        label: 'All Pools',  sub: 'Active resources' },
  { id: 'internal',   label: 'Internal',   sub: 'FT · SME · WILP' },
  { id: 'freelancer', label: 'Freelancer', sub: 'External pool' },
];

// Status tabs. ALL / FREE / OCCUPIED / LEAVE operate on ACTIVE trainers
// (Exit trainers are hidden). The dedicated EXIT tab reveals off-boarded
// resources only.
const STATUS_FILTERS = [
  { id: 'all',      label: 'ALL' },
  { id: 'free',     label: 'FREE' },
  { id: 'occupied', label: 'OCCUPIED' },
  { id: 'leave',    label: 'LEAVE' },
  { id: 'exit',     label: 'EXIT' },
];

const DIR_PAGE_SIZE = 24;

export default function Matrix({ active }) {
  const { data, error, isLoading, refetch } = useGetTrainersQuery({ limit: 500 });
  const { data: rtRes } = useGetRequestTrackQuery({ limit: 500 });
  const rtRows = rtRes?.rows || [];
  const rtHeaders = rtRes?.headers || [];

  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [trackFilter, setTrackFilter]   = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [poolFilter, setPoolFilter]     = useState('all');
  const [poolOpen, setPoolOpen]         = useState(false);
  const [dirPage, setDirPage]           = useState(0);        // 0-based page index for directory
  const [selectedTrainer, setSelectedTrainer] = useState(null); // trainer enriched obj for drawer
  const [dayCell, setDayCell] = useState(null); // { iso, programmes: [{client, course, trainers, cell}] }
  const [pickedReq, setPickedReq] = useState(null);

  // Resolve a parsed cell ({client, course}) to a request-track raw row.
  // Strict-first: exact Delivery-ID, then both client AND course substring
  // match (with non-empty fields on both sides). Empty-field rows are
  // never treated as matches — that was the bug behind the spurious
  // "SKI-101 / unassigned / empty" results.
  const resolveCellToRaw = useCallback((parsed) => {
    if (!parsed) return null;
    const client = String(parsed.client || '').trim().toLowerCase();
    const course = String(parsed.course || '').trim().toLowerCase();
    if (!client && !course) return null;

    // 1. Exact Delivery-ID match against either token.
    for (const r of rtRows) {
      const rDel = String(r['Delivery ID'] || '').trim().toLowerCase();
      if (!rDel) continue;
      if (rDel === client || rDel === course) return r;
    }

    // 2. Strong dual-field match — BOTH client AND course must align,
    //    and the candidate row's fields must be non-empty.
    const containsBothWays = (haystack, needle) =>
      haystack.includes(needle) || needle.includes(haystack);
    for (const r of rtRows) {
      const rClient = String(r['Client Name'] || '').trim().toLowerCase();
      const rCourse = String(r['Course']      || '').trim().toLowerCase();
      if (!rClient || !rCourse) continue;
      const clientHit = client && containsBothWays(rClient, client);
      const courseHit = course && containsBothWays(rCourse, course);
      if (clientHit && courseHit) return r;
    }

    // 3. Last-resort: course-only strong match (when the cell has no client token).
    if (!client && course) {
      for (const r of rtRows) {
        const rCourse = String(r['Course'] || '').trim().toLowerCase();
        if (!rCourse) continue;
        if (containsBothWays(rCourse, course)) return r;
      }
    }
    return null;
  }, [rtRows]);

  const openProgrammeFromCell = useCallback((parsed) => {
    const raw = resolveCellToRaw(parsed);
    if (raw) {
      setPickedReq(buildRequirementRow(raw));
    } else {
      const label = [parsed?.client, parsed?.course].filter(Boolean).join(' · ') || 'this assignment';
      window.notify?.('Programme not found', `No request-track row matches ${label}.`, 'warn');
    }
  }, [resolveCellToRaw]);

  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toIso(today), [today]);

  // ----- Date-range filter (Start / End + Apply / Reset) -----
  const defaultStart = useMemo(() => toIso(today), [today]);
  const defaultEnd   = useMemo(
    () => toIso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + (WINDOW_DAYS - 1))),
    [today],
  );
  const [rangeStart, setRangeStart] = useState(defaultStart);
  const [rangeEnd,   setRangeEnd]   = useState(defaultEnd);

  // Build the day columns from the committed range (capped at 92 for perf).
  const days = useMemo(() => {
    const [sy, sm, sd] = rangeStart.split('-').map(Number);
    const [ey, em, ed] = rangeEnd.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end   = new Date(ey, em - 1, ed);
    const arr = [];
    if (end < start) return arr;
    const cursor = new Date(start);
    while (cursor <= end && arr.length < 92) {
      arr.push({
        iso: toIso(cursor),
        weekday: cursor.toLocaleDateString('en-GB', { weekday: 'short' })[0],
        day: cursor.getDate(),
        weekend: cursor.getDay() === 0, // Sunday week-off
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return arr;
  }, [rangeStart, rangeEnd]);
  const windowIsos = useMemo(() => days.map((d) => d.iso), [days]);
  const workingDays = useMemo(() => days.filter((d) => !d.weekend).length || 1, [days]);

  const trainers = data?.trainers || [];

  // ---- Heavy derivation #1: track + client vocab from each trainer's FULL
  // history. This is the expensive part (regex over every schedule cell), so
  // it depends only on `trainers` and is computed once — NOT re-run when the
  // date range / window changes. ----
  const trackClient = useMemo(() => {
    const map = new Map();
    for (const t of trainers) {
      const sched = t.schedule || {};
      const trackToks = new Set();
      const clientSet = new Set();
      for (const cell of Object.values(sched)) {
        if (isNoClass(cell)) continue;
        const k = classifyCell(cell);
        if (k === 'free' || k === 'leave' || k === 'exit') continue;
        const { client, course } = parseAssignment(cell);
        for (const tr of deriveTracks(`${course} ${cell}`)) trackToks.add(tr);
        const cl = cleanClient(client);
        if (cl) clientSet.add(cl);
      }
      map.set(t, { trackToks, clientSet });
    }
    return map;
  }, [trainers]);

  // ---- Derivation #2: per-window stats + today's status. Lightweight loop
  // over just the window dates; re-runs when the range changes. ----
  const enriched = useMemo(() => {
    return trainers.map((t) => {
      const sched = t.schedule || {};
      let full = 0, partial = 0, leave = 0, exitW = 0, freeWork = 0;
      for (const iso of windowIsos) {
        const st = cellState(sched[iso] || '', iso);
        if (st === 'full') full += 1;
        else if (st === 'partial') partial += 1;
        else if (st === 'leave') leave += 1;
        else if (st === 'exit') exitW += 1;
        else if (st === 'free') freeWork += 1;
      }
      const allocated = full + partial;
      const load = Math.round((allocated / workingDays) * 100);
      const todayState = cellState(sched[todayIso] || '', todayIso);
      let status;
      if (todayState === 'exit') status = 'exit';
      else if (todayState === 'leave') status = 'leave';
      else if (todayState === 'full' || todayState === 'partial') status = 'occupied';
      else status = 'free';
      const tc = trackClient.get(t) || { trackToks: new Set(), clientSet: new Set() };
      // Exit = off-boarded type, OR the resource is exit-dominated in the
      // window with no active teaching (their cells read "Exit", not "Leave").
      const isExit = t.type === 'EXIT' || (exitW > 0 && allocated === 0);
      const pool = isExit ? 'exit' : (INTERNAL_TYPES.has(t.type) ? 'internal' : 'freelancer');
      return {
        ref: t,
        name: t.name,
        employee_id: t.employee_id,
        type: t.type,
        isInternal: pool === 'internal',
        pool,
        trackToks: tc.trackToks,
        clientSet: tc.clientSet,
        stats: { avail: freeWork, allocated, leave, load },
        status,
      };
    });
  }, [trainers, windowIsos, workingDays, todayIso, trackClient]);

  // Scope rows by the active EXIT tab + pool dropdown:
  //  • EXIT tab  → only off-boarded (pool === 'exit'), ignoring the pool drop.
  //  • otherwise → active resources only (exit hidden), within the pool drop.
  const poolScoped = useMemo(() => {
    if (statusFilter === 'exit') return enriched.filter((e) => e.pool === 'exit');
    return enriched.filter((e) => e.pool !== 'exit' && (poolFilter === 'all' || e.pool === poolFilter));
  }, [enriched, poolFilter, statusFilter]);

  // Track + Client chip vocabularies (top by frequency, within the pool).
  const { trackChips, clientChips } = useMemo(() => {
    const tCount = new Map(), cCount = new Map();
    for (const e of poolScoped) {
      for (const tok of e.trackToks) tCount.set(tok, (tCount.get(tok) || 0) + 1);
      for (const cl of e.clientSet) cCount.set(cl, (cCount.get(cl) || 0) + 1);
    }
    const top = (m, n) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
    return { trackChips: top(tCount, 10), clientChips: top(cCount, 8) };
  }, [poolScoped]);

  const poolCounts = useMemo(() => ({
    all: enriched.length,
    internal: enriched.filter((e) => e.pool === 'internal').length,
    freelancer: enriched.filter((e) => e.pool === 'freelancer').length,
    exit: enriched.filter((e) => e.pool === 'exit').length,
  }), [enriched]);

  // Apply search / track / client + the today-status sub-filter.
  // (FREE / OCCUPIED / LEAVE filter active rows by TODAY's live cell state;
  //  ALL and EXIT don't apply a per-day status filter.)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const todayStatus = (statusFilter === 'free' || statusFilter === 'occupied' || statusFilter === 'leave')
      ? statusFilter : null;
    return poolScoped.filter((e) => {
      if (todayStatus && e.status !== todayStatus) return false;
      if (q) {
        const hay = `${e.name} ${e.employee_id} ${Array.from(e.trackToks).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (trackFilter && !e.trackToks.has(trackFilter)) return false;
      if (clientFilter && !e.clientSet.has(clientFilter)) return false;
      return true;
    });
  }, [poolScoped, search, trackFilter, clientFilter, statusFilter]);

  // Sort: occupied/leave first (most informative), then name.
  const gridRows = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const rank = (s) => (s === 'occupied' ? 0 : s === 'leave' ? 1 : 2);
      return rank(a.status) - rank(b.status) || a.name.localeCompare(b.name);
    });
  }, [filtered]);

  const totals = useMemo(() => ({
    total: enriched.length,
    internal: enriched.filter((e) => e.pool === 'internal').length,
    freelancer: enriched.filter((e) => e.pool === 'freelancer').length,
    exit: enriched.filter((e) => e.pool === 'exit').length,
  }), [enriched]);

  // Switching pool clears the track/client filters (their vocab changes).
  const pickPool = (id) => {
    setPoolFilter(id);
    setTrackFilter('');
    setClientFilter('');
    setDirPage(0);
    setPoolOpen(false);
  };

  // Reset directory page when any filter changes.
  const setTrackFilterResetting = (v) => { setTrackFilter(v); setDirPage(0); };
  const setClientFilterResetting = (v) => { setClientFilter(v); setDirPage(0); };
  const setSearchResetting = (v) => { setSearch(v); setDirPage(0); };
  const setStatusFilterResetting = (v) => { setStatusFilter(v); setDirPage(0); };

  const dirTotalPages = Math.max(1, Math.ceil(gridRows.length / DIR_PAGE_SIZE));
  const dirPageSafe   = Math.min(dirPage, dirTotalPages - 1);
  const dirRows       = gridRows.slice(dirPageSafe * DIR_PAGE_SIZE, (dirPageSafe + 1) * DIR_PAGE_SIZE);

  // ---- Export handler: 2 sheets, deduplicated ----
  const handleExport = () => {
    if (!gridRows.length) return;

    // Sheet 1 – Trainer Roster (one row per trainer, deduped by name+id)
    const rosterRows = gridRows.map((e) => ({
      name:         e.name,
      employee_id:  e.employee_id || '—',
      type:         e.type,
      pool:         e.pool,
      today_status: e.status,
      avail_days:   e.stats.avail,
      allocated:    e.stats.allocated,
      leave_days:   e.stats.leave,
      load_pct:     e.stats.load,
      tracks:       Array.from(e.trackToks).join(', ') || '—',
      clients:      Array.from(e.clientSet).join(', ') || '—',
      window_start: rangeStart,
      window_end:   rangeEnd,
    }));

    // Sheet 2 – Day-wise Occupancy (one row per trainer × date, unique by design)
    const occupancyRows = [];
    for (const e of gridRows) {
      const sched = e.ref.schedule || {};
      for (const d of days) {
        const cell = sched[d.iso] || '';
        const st   = cellState(cell, d.iso);
        occupancyRows.push({
          trainer:      e.name,
          employee_id:  e.employee_id || '—',
          type:         e.type,
          pool:         e.pool,
          date:         d.iso,
          day_of_week:  new Date(d.iso).toLocaleDateString('en-GB', { weekday: 'long' }),
          cell_value:   cell || '—',
          state:        STATE_LABEL[st] || st,
        });
      }
    }

    exportToExcel({
      filename: 'trainer-matrix',
      sheets: [
        {
          name: 'Trainer Roster',
          columns: [
            { header: 'Trainer Name',      key: 'name'         },
            { header: 'Employee ID',       key: 'employee_id'  },
            { header: 'Type',              key: 'type'         },
            { header: 'Pool',              key: 'pool'         },
            { header: 'Today’s Status',    key: 'today_status' },
            { header: 'Avail Days',        key: 'avail_days'   },
            { header: 'Allocated Days',    key: 'allocated'    },
            { header: 'Leave Days',        key: 'leave_days'   },
            { header: 'Load %',            key: 'load_pct'     },
            { header: 'Tracks',            key: 'tracks'       },
            { header: 'Clients',           key: 'clients'      },
            { header: 'Window Start',      key: 'window_start' },
            { header: 'Window End',        key: 'window_end'   },
          ],
          rows: rosterRows,
        },
        {
          name: 'Day-wise Occupancy',
          columns: [
            { header: 'Trainer Name',  key: 'trainer'      },
            { header: 'Employee ID',   key: 'employee_id'  },
            { header: 'Type',          key: 'type'         },
            { header: 'Pool',          key: 'pool'         },
            { header: 'Date',          key: 'date'         },
            { header: 'Day of Week',   key: 'day_of_week'  },
            { header: 'Cell Value',    key: 'cell_value'   },
            { header: 'State',         key: 'state'        },
          ],
          rows: occupancyRows,
        },
      ],
    });
  };

  // Close the pool dropdown on outside click / Escape.
  const poolRef = useRef(null);
  useEffect(() => {
    if (!poolOpen) return;
    const onDown = (e) => { if (poolRef.current && !poolRef.current.contains(e.target)) setPoolOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setPoolOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [poolOpen]);

  const activePool = POOLS.find((p) => p.id === poolFilter) || POOLS[0];

  if (error) {
    return <ErrorPanel panelId="matrix" active={active}
      error={error?.error || error?.message || 'Failed to load trainers.'} onRetry={() => refetch()} />;
  }
  if (isLoading && !data) return <LoadingPanel panelId="matrix" active={active} />;

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="matrix">
      {/* Date-range filter */}
      <div className="mx-toolbar">
        <DateRangeFilter
          start={rangeStart} end={rangeEnd}
          defaultStart={defaultStart} defaultEnd={defaultEnd}
          onApply={(s, e) => { setRangeStart(s); setRangeEnd(e); }}
        />
      </div>

      {/* ===== Engagement grid card ===== */}
      <div className="card mx-card">
        <header className="mx-head">
          <div>
            <div className="mx-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              TRAINER MATRIX · ENGAGEMENT GRID
            </div>
            <div className="mx-sub">Live allocation per trainer × day · {days.length}-day window · hover any cell</div>
          </div>
          <div className="mx-head-right">
            <div className="mx-search">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input placeholder="Search trainer or track…" value={search} onChange={(e) => setSearchResetting(e.target.value)} />
              {search && <button className="mx-search-clear" onClick={() => setSearchResetting('')} aria-label="Clear">×</button>}
            </div>
            <div className="mx-status-chips" role="tablist">
              {STATUS_FILTERS.map((s) => (
                <button key={s.id} type="button" role="tab" aria-selected={statusFilter === s.id}
                  className={`mx-status-chip${statusFilter === s.id ? ' is-active' : ''}`}
                  onClick={() => setStatusFilterResetting(s.id)}>{s.label}</button>
              ))}
            </div>

            {/* Pool dropdown — Internal / Freelancer / Exit (right corner) */}
            <div ref={poolRef} className={`mx-pool${poolOpen ? ' is-open' : ''}`}>
              <button type="button" className="mx-pool-trigger" onClick={() => setPoolOpen((v) => !v)}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="mx-pool-label">{activePool.label}</span>
                <span className="mx-pool-count">{poolCounts[poolFilter]}</span>
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-pool-caret">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {poolOpen && (
                <div className="mx-pool-menu">
                  {POOLS.map((p) => (
                    <button key={p.id} type="button"
                      className={`mx-pool-opt${poolFilter === p.id ? ' is-active' : ''}`}
                      onClick={() => pickPool(p.id)}>
                      <span className="mx-pool-opt-main">
                        <span className="mx-pool-opt-label">{p.label}</span>
                        <span className="mx-pool-opt-sub">{p.sub}</span>
                      </span>
                      <span className="mx-pool-opt-count">{poolCounts[p.id]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ExportButton
                onClick={handleExport}
                disabled={!gridRows.length}
                label={`Export (${gridRows.length})`}
              />
            </div>
          </div>
        </header>

        {/* Track + Client dropdowns */}
        <div className="mx-filter-bar">
          <FilterDropdown
            label="TRACK"
            icon={<svg viewBox="0 0 24 24" width="12" height="12" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
            options={trackChips}
            value={trackFilter}
            onChange={setTrackFilterResetting}
            allLabel="All Tracks"
          />
          <FilterDropdown
            label="CLIENT"
            icon={<svg viewBox="0 0 24 24" width="12" height="12" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            options={clientChips}
            value={clientFilter}
            onChange={setClientFilterResetting}
            allLabel="All Clients"
          />
          {(trackFilter || clientFilter) && (
            <button type="button" className="mx-filter-clear" onClick={() => { setTrackFilterResetting(''); setClientFilterResetting(''); }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Grid */}
        <div className="mx-grid-wrap">
          <div className="mx-grid" style={{ gridTemplateColumns: `190px repeat(${days.length}, minmax(22px, 1fr))` }}>
            <div className="mx-corner">Trainer</div>
            {days.map((d) => (
              <button
                key={d.iso}
                type="button"
                className={`mx-dhead is-clickable${d.iso === todayIso ? ' is-today' : ''}${d.weekend ? ' is-weekend' : ''}`}
                title={`${d.iso} · click to list programmes`}
                onClick={() => {
                  const programmes = [];
                  const seen = new Set();
                  for (const row of gridRows) {
                    const cell = (row.ref.schedule || {})[d.iso];
                    if (!cell) continue;
                    const st = cellState(cell, d.iso);
                    if (st !== 'full' && st !== 'partial') continue;
                    const parsed = parseAssignment(cell);
                    const key = `${parsed.client}|${parsed.course}|${cell}`;
                    if (seen.has(key)) {
                      const entry = programmes.find((p) => p.key === key);
                      if (entry) entry.trainers.push(row.name);
                      continue;
                    }
                    seen.add(key);
                    programmes.push({ key, ...parsed, cell, trainers: [row.name] });
                  }
                  setDayCell({ iso: d.iso, programmes });
                }}
              >
                <span className="mx-dhead-wd">{d.weekday}</span>
                <span className="mx-dhead-num">{d.day}</span>
              </button>
            ))}

            {gridRows.length === 0 ? (
              <div className="mx-empty" style={{ gridColumn: `1 / span ${days.length + 1}` }}>
                No trainers match the current filters.
              </div>
            ) : gridRows.map((e) => (
              <MatrixRow
                key={`${e.employee_id || ''}-${e.name}`}
                e={e}
                days={days}
                todayIso={todayIso}
                onCellPick={({ iso, trainer }) => {
                  // Reuse the day-cell modal but pre-filter to that trainer's row.
                  const programmes = [];
                  const seen = new Set();
                  for (const row of gridRows) {
                    const cell = (row.ref.schedule || {})[iso];
                    if (!cell) continue;
                    const st = cellState(cell, iso);
                    if (st !== 'full' && st !== 'partial') continue;
                    const parsed = parseAssignment(cell);
                    const key = `${parsed.client}|${parsed.course}|${cell}`;
                    if (seen.has(key)) {
                      const entry = programmes.find((p) => p.key === key);
                      if (entry) entry.trainers.push(row.name);
                      continue;
                    }
                    seen.add(key);
                    programmes.push({ key, ...parsed, cell, trainers: [row.name] });
                  }
                  setDayCell({ iso, programmes, presetSearch: trainer });
                }}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mx-legend">
          <span className="mx-leg"><span className="mx-leg-sw is-full" /> Fully Occupied</span>
          <span className="mx-leg"><span className="mx-leg-sw is-partial" /> Partially Occupied</span>
          <span className="mx-leg"><span className="mx-leg-sw is-weekoff" /> Week Off</span>
          <span className="mx-leg"><span className="mx-leg-sw is-holiday" /> No Class</span>
          <span className="mx-leg"><span className="mx-leg-sw is-leave" /> Leave</span>
          <span className="mx-leg"><span className="mx-leg-sw is-free" /> Free</span>
          <span className="mx-leg-count">
            {gridRows.length} of {statusFilter === 'exit' ? totals.exit : (totals.total - totals.exit)} {statusFilter === 'exit' ? 'exited' : 'active'} trainers
          </span>
        </div>
      </div>

      {/* ===== Trainer Directory snapshot ===== */}
      <div className="card mx-dir">
        <header className="mx-dir-head">
          <div>
            <div className="mx-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              TRAINER DIRECTORY · SNAPSHOT
            </div>
            <div className="mx-dir-sub">
              <strong>{totals.total}</strong> trainers monitored · <strong>{totals.internal}</strong> internal · <strong>{totals.freelancer}</strong> freelancer pool
              <span className="mx-dir-sub-hint"> · Click a card to see allocations</span>
            </div>
          </div>
          {dirTotalPages > 1 && (
            <div className="mx-dir-pager">
              <button type="button" className="mx-pager-btn" disabled={dirPageSafe === 0}
                onClick={() => setDirPage((p) => Math.max(0, p - 1))} aria-label="Previous page">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span className="mx-pager-info">
                Page <strong>{dirPageSafe + 1}</strong> / <strong>{dirTotalPages}</strong>
                <span className="mx-pager-total"> · {gridRows.length} trainers</span>
              </span>
              <button type="button" className="mx-pager-btn" disabled={dirPageSafe >= dirTotalPages - 1}
                onClick={() => setDirPage((p) => Math.min(dirTotalPages - 1, p + 1))} aria-label="Next page">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          )}
        </header>
        <div className="mx-dir-grid">
          {dirRows.map((e) => (
            <DirectoryCard
              key={`d-${e.employee_id || ''}-${e.name}`}
              e={e}
              onClick={() => setSelectedTrainer(e)}
            />
          ))}
        </div>
        {gridRows.length > DIR_PAGE_SIZE && (
          <div className="mx-dir-foot">
            Showing <strong>{dirPageSafe * DIR_PAGE_SIZE + 1}–{Math.min((dirPageSafe + 1) * DIR_PAGE_SIZE, gridRows.length)}</strong> of <strong>{gridRows.length}</strong> matching trainers
          </div>
        )}
      </div>

      {/* ===== Trainer Allocation Drawer ===== */}
      {selectedTrainer && (
        <TrainerDrawer
          trainer={selectedTrainer}
          days={days}
          onClose={() => setSelectedTrainer(null)}
        />
      )}

      {dayCell && (
        <DayCellModal
          iso={dayCell.iso}
          programmes={dayCell.programmes}
          presetSearch={dayCell.presetSearch}
          onPick={(parsed) => { setDayCell(null); openProgrammeFromCell(parsed); }}
          onClose={() => setDayCell(null)}
        />
      )}

      {pickedReq && (
        <RequirementModal
          row={pickedReq}
          headers={rtHeaders}
          onClose={() => setPickedReq(null)}
        />
      )}
    </section>
  );
}

/* ----- Day cell modal — programmes running on the clicked column ----- */
function DayCellModal({ iso, programmes, presetSearch = '', onPick, onClose }) {
  const [q, setQ] = useState(presetSearch);
  useEffect(() => { setQ(presetSearch); }, [presetSearch]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const needle = q.trim().toLowerCase();
  const visible = programmes.filter((p) =>
    !needle ||
    [p.client, p.course, p.cell, p.trainers.join(' ')].some((v) => String(v || '').toLowerCase().includes(needle))
  );
  const niceDate = (() => {
    try {
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return iso; }
  })();
  return (
    <div className="oa-det-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="oa-det-panel is-wide" role="dialog" aria-modal="true" aria-label={`Programmes on ${niceDate}`}>
        <div className="oa-det-head rqd-head">
          <div className="oa-det-avatar rqd-head-avatar" style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent2))' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: '#fff' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <div className="rqd-head-info">
            <div className="rqd-head-title-row">
              <span className="rqd-head-title">{niceDate}</span>
              <span className="rqd-head-sep">|</span>
              <span className="rqd-head-window">{programmes.length} programme{programmes.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          <button type="button" className="oa-det-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="rqd-body" style={{ gridTemplateColumns: '1fr' }}>
          <div className="rqd-main">
            <div className="rqd-section">
              <div className="rqd-section-head">
                <div className="rqd-section-title">Programmes Running</div>
                <div className="rqd-search" style={{ width: 280 }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input type="search" placeholder="Search programme, client, trainer…" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                <div className="rqd-section-count">{visible.length}/{programmes.length}</div>
              </div>
              {visible.length === 0 ? (
                <div className="rqd-empty">
                  {programmes.length ? 'No matches for that search.' : 'No active programmes on this day.'}
                </div>
              ) : (
                <div className="rqd-trainer-grid">
                  {visible.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      className="rqd-trainer-card"
                      style={{ textAlign: 'left', cursor: 'pointer' }}
                      onClick={() => onPick(p)}
                    >
                      <div className="rqd-trainer-avatar">{(p.client || p.course || '?').slice(0, 2).toUpperCase()}</div>
                      <div className="rqd-trainer-meta">
                        <div className="rqd-trainer-name">
                          <span className="rqd-trainer-name-text">{p.course || p.cell}</span>
                        </div>
                        <div className="rqd-trainer-sub">
                          {p.client ? `${p.client} · ` : ''}{p.trainers.length} trainer{p.trainers.length === 1 ? '' : 's'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----- one trainer row (memoised) -----
   React.memo means filtering only mounts/unmounts rows; the cells of rows
   that remain are NOT re-rendered, since `e`, `days` and `todayIso` keep
   stable references across filter changes. This is the main perf win for
   the 250-row × 50-col grid. */
const MatrixRow = memo(function MatrixRow({ e, days, todayIso, onCellPick }) {
  const sched = e.ref.schedule || {};
  return (
    <div style={{ display: 'contents' }}>
      <div className="mx-rowhead" title={`${e.name} · ${TYPE_LABEL[e.type] || e.type}`}>
        <span className="mx-rowhead-name">{e.name}</span>
      </div>
      {days.map((d) => {
        const cell = sched[d.iso] || '';
        const st = cellState(cell, d.iso);
        const parsed = (st === 'full' || st === 'partial') ? parseAssignment(cell) : null;
        const tip = parsed
          ? `${e.name} · ${d.iso}\n${STATE_LABEL[st]} · ${parsed.client ? parsed.client + ' · ' : ''}${parsed.course || cell}`
          : `${e.name} · ${d.iso}\n${STATE_LABEL[st]}${st === 'holiday' && cell.trim() ? ` · ${cell.trim()}` : ''}`;
        return (
          <div
            key={d.iso}
            className={`mx-cell is-${st}${d.iso === todayIso ? ' is-today' : ''}${parsed ? ' is-pickable' : ''}`}
            title={tip}
            onClick={parsed && onCellPick ? () => onCellPick({ iso: d.iso, trainer: e.name, parsed }) : undefined}
          />
        );
      })}
    </div>
  );
});

/* ----- filter dropdown ----- */
function FilterDropdown({ label, icon, options, value, onChange, allLabel }) {
  return (
    <div className="mx-flt">
      <label className="mx-flt-label">{icon}{label}</label>
      <div className="mx-flt-wrap">
        <select
          className="mx-flt-sel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{allLabel || `All ${label}s`}</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <svg className="mx-flt-caret" viewBox="0 0 24 24" width="11" height="11" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
    </div>
  );
}

/* ----- directory card ----- */
const STATUS_PILL = {
  free:     { label: 'FREE TODAY',     tone: 'ok' },
  occupied: { label: 'OCCUPIED TODAY', tone: 'busy' },
  leave:    { label: 'ON LEAVE',       tone: 'leave' },
  exit:     { label: 'EXITED',         tone: 'exit' },
};
function DirectoryCard({ e, onClick }) {
  const pill = e.pool === 'exit' ? STATUS_PILL.exit : (STATUS_PILL[e.status] || STATUS_PILL.free);
  const loadTone = e.stats.load >= 85 ? 'high' : e.stats.load >= 50 ? 'mid' : 'low';
  const skill = Array.from(e.trackToks).slice(0, 2).join(' / ').toUpperCase() || '—';
  return (
    <div className={`mx-dcard mx-dcard-${pill.tone} mx-dcard-clickable`} onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(ev) => ev.key === 'Enter' && onClick?.()}
      title={`View ${e.name}'s allocations`}>
      <div className="mx-dcard-top">
        <span className="mx-dcard-avatar">{initials(e.name)}</span>
        <div className="mx-dcard-id">
          <div className="mx-dcard-name" title={e.name}>{e.name}</div>
          <div className="mx-dcard-meta">{e.employee_id || '—'} · {e.isInternal ? 'Internal' : 'Freelancer'} · {skill}</div>
        </div>
        <span className={`mx-dcard-pill mx-pill-${pill.tone}`}><span className="mx-pill-dot" />{pill.label}</span>
      </div>
      <div className={`mx-dcard-bar mx-dcard-bar-${loadTone}`}>
        <span style={{ width: `${Math.min(100, e.stats.load)}%` }} />
      </div>
      <div className="mx-dcard-stats">
        <div className="mx-stat"><span className="mx-stat-num is-ok">{e.stats.avail}</span><span className="mx-stat-lab">AVAIL DAYS</span></div>
        <div className="mx-stat"><span className="mx-stat-num">{e.stats.allocated}</span><span className="mx-stat-lab">ALLOCATED</span></div>
        <div className="mx-stat"><span className={`mx-stat-num${e.stats.leave > 0 ? ' is-leave' : ''}`}>{e.stats.leave}</span><span className="mx-stat-lab">LEAVE</span></div>
        <div className="mx-stat"><span className={`mx-stat-num is-${loadTone}`}>{e.stats.load}%</span><span className="mx-stat-lab">LOAD</span></div>
      </div>
      <div className="mx-dcard-chevron">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </div>
  );
}

/* ----- trainer allocation drawer ----- */
const fmtIso = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
  catch { return iso; }
};

const TRACK_COLORS = {
  'Java FS': '#6366f1', 'Python / ML': '#22d3a5', '.NET / Cloud': '#06b6d4',
  'Web / React': '#f5c542', 'Cyber / QA': '#a855f7', 'SQL / DB': '#fb923c',
  'SAP': '#10b981', 'DSA': '#e879f9', 'C / C++': '#64748b', 'Aptitude': '#f97316',
};
const trackColor = (toks) => {
  if (!toks || toks.size === 0) return 'var(--text-muted)';
  const first = [...toks][0];
  return TRACK_COLORS[first] || 'var(--text-muted)';
};

function TrainerDrawer({ trainer, days, onClose }) {
  const sched = trainer.ref.schedule || {};
  const blocks = buildAllocationBlocks(sched, days);
  const pill = trainer.pool === 'exit' ? STATUS_PILL.exit : (STATUS_PILL[trainer.status] || STATUS_PILL.free);
  const skill = Array.from(trainer.trackToks).join(', ').toUpperCase() || '—';
  const clients = Array.from(trainer.clientSet).join(', ') || '—';
  const accentColor = trackColor(trainer.trackToks);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="mx-drawer-overlay" onClick={onClose} />
      <aside className="mx-drawer" role="dialog" aria-label={`${trainer.name} allocations`}>
        {/* Header */}
        <div className="mx-drawer-head">
          <div className="mx-drawer-avatar" style={{ background: accentColor + '22', borderColor: accentColor + '55', color: accentColor }}>
            {initials(trainer.name)}
          </div>
          <div className="mx-drawer-ident">
            <div className="mx-drawer-name">{trainer.name}</div>
            <div className="mx-drawer-sub">{trainer.employee_id || '—'} · {trainer.isInternal ? 'Internal' : 'Freelancer'}</div>
          </div>
          <button className="mx-drawer-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Quick stats */}
        <div className="mx-drawer-stats">
          <div className="mx-drawer-stat">
            <span className="mx-drawer-stat-n" style={{ color: '#22d3a5' }}>{trainer.stats.avail}</span>
            <span className="mx-drawer-stat-l">Free Days</span>
          </div>
          <div className="mx-drawer-stat">
            <span className="mx-drawer-stat-n" style={{ color: '#4f86c6' }}>{trainer.stats.allocated}</span>
            <span className="mx-drawer-stat-l">Allocated</span>
          </div>
          <div className="mx-drawer-stat">
            <span className="mx-drawer-stat-n" style={{ color: trainer.stats.leave > 0 ? '#f59e0b' : 'var(--text-muted)' }}>{trainer.stats.leave}</span>
            <span className="mx-drawer-stat-l">Leave</span>
          </div>
          <div className="mx-drawer-stat">
            <span className="mx-drawer-stat-n" style={{ color: trainer.stats.load >= 85 ? '#ef4444' : trainer.stats.load >= 50 ? '#f59e0b' : '#22d3a5' }}>{trainer.stats.load}%</span>
            <span className="mx-drawer-stat-l">Load</span>
          </div>
        </div>

        {/* Skills + clients */}
        <div className="mx-drawer-meta">
          <div className="mx-drawer-meta-row"><span className="mx-drawer-meta-key">Tracks</span><span className="mx-drawer-meta-val">{skill}</span></div>
          <div className="mx-drawer-meta-row"><span className="mx-drawer-meta-key">Clients</span><span className="mx-drawer-meta-val">{clients}</span></div>
        </div>

        {/* Allocation blocks */}
        <div className="mx-drawer-section-title">
          PROGRAMME ALLOCATIONS
          <span className="mx-drawer-section-badge">{blocks.length} block{blocks.length !== 1 ? 's' : ''}</span>
        </div>

        {blocks.length === 0 ? (
          <div className="mx-drawer-empty">No allocations in the selected date window.</div>
        ) : (
          <div className="mx-drawer-blocks">
            {blocks.map((b, i) => {
              const tc = deriveTracks(`${b.course} ${b.rawCell}`);
              const bColor = TRACK_COLORS[tc[0]] || '#64748b';
              return (
                <div key={i} className="mx-drawer-block" style={{ borderLeftColor: bColor }}>
                  <div className="mx-drawer-block-head">
                    <span className="mx-drawer-block-course">{b.course || b.rawCell || 'Unknown'}</span>
                    <span className="mx-drawer-block-role" style={{ color: b.role === 'TA / Backup' ? '#f59e0b' : '#4f86c6' }}>{b.role}</span>
                  </div>
                  <div className="mx-drawer-block-meta">
                    {b.client && <span className="mx-drawer-block-client">{b.client}</span>}
                    <span className="mx-drawer-block-dates">{fmtIso(b.startIso)} → {fmtIso(b.endIso)}</span>
                    <span className="mx-drawer-block-days">{b.days}d</span>
                  </div>
                  {tc.length > 0 && (
                    <div className="mx-drawer-block-tracks">
                      {tc.map((t) => <span key={t} className="mx-drawer-block-track" style={{ background: (TRACK_COLORS[t] || '#64748b') + '22', color: TRACK_COLORS[t] || '#64748b' }}>{t}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </>
  );
}
