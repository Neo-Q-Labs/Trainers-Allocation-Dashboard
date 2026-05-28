/* ============================================================
   Requirement-row helpers — shared across pages that drill into
   a single Request ID Track row (Requirements, Calendar, Clients,
   Matrix). All pages render the same RequirementModal, so they
   all need to derive the same `row` shape from the raw record.
   ============================================================ */

export const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
export const MONTHS_3   = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
export const MONTHS_CAP = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const STATUS_TONE = { OPEN: 'open', CLOSED: 'closed', CANCELLED: 'cancelled' };
export const TYPE_TONE   = { INTERNAL: 'internal', FREELANCER: 'freelancer', MIXED: 'mixed', UNASSIGNED: 'unassigned' };

export const parseNum = (v) => {
  if (v == null || v === '') return 0;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

export function parseSheetDate(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return new Date(EXCEL_EPOCH + raw * 86400000);
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return new Date(EXCEL_EPOCH + Number(s) * 86400000);
  const m = s.match(/^(\d{1,2})[\s\-/](\d{1,2}|[A-Za-z]{3,9})[\s\-/](\d{2,4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    let month;
    if (/^\d+$/.test(m[2])) month = parseInt(m[2], 10) - 1;
    else month = MONTHS_3.findIndex((mm) => m[2].toLowerCase().startsWith(mm));
    if (month < 0) return null;
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    return new Date(Date.UTC(year, month, day));
  }
  const ts = Date.parse(s);
  return Number.isFinite(ts) ? new Date(ts) : null;
}

export const fmtShort = (d) => (d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—');
export const fmtFull  = (d) => (d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export function deriveType(raw) {
  const internal = parseNum(raw['Internal']);
  const fl = parseNum(raw['Existing Freelancers']) + parseNum(raw['New Freelancers Hired']) + parseNum(raw['New Freelancer Required']);
  if (internal > 0 && fl > 0) return 'MIXED';
  if (fl > 0 && internal === 0) return 'FREELANCER';
  if (internal > 0) return 'INTERNAL';
  return 'UNASSIGNED';
}

export function deriveStatus(raw) {
  const a = String(raw['Allocation Status'] || '').toLowerCase();
  const t = String(raw['Training Status'] || '').toLowerCase();
  if (/cancel|drop/.test(a) || /cancel|drop/.test(t)) return 'CANCELLED';
  if (/closed?|complete/.test(a) || /closed?|complete/.test(t)) return 'CLOSED';
  return 'OPEN';
}

export function summarise(raw) {
  const trainerReq = parseNum(raw['Total Trainer Required']);
  const taReq      = parseNum(raw["Total TA's Required"]);
  const required   = trainerReq + taReq;
  const internal   = parseNum(raw['Internal']);
  const fl = parseNum(raw['Existing Freelancers']) + parseNum(raw['New Freelancers Hired']);
  const filled = internal + fl;
  const gap = Math.max(0, required - filled);
  return { trainerReq, taReq, required, internal, fl_filled: fl, filled, gap };
}

export function deriveRisk(raw, gap) {
  const cell = String(raw['Risk'] || '').trim();
  const explicit = parseInt(cell.replace(/[^\d]/g, ''), 10);
  if (Number.isFinite(explicit) && /\d/.test(cell)) return explicit;
  return gap;
}

export function windowLabel(start, end) {
  if (start && end) return `${fmtShort(start)} → ${fmtShort(end)}`;
  if (start) return `from ${fmtShort(start)}`;
  if (end)   return `until ${fmtShort(end)}`;
  return '—';
}

/* Build the `row` object RequirementModal expects from a raw API record. */
export function buildRequirementRow(raw, todayUtc = null) {
  if (!raw) return null;
  const today = todayUtc ?? Date.UTC(
    new Date().getFullYear(), new Date().getMonth(), new Date().getDate(),
  );
  const summary = summarise(raw);
  const start = parseSheetDate(raw['Program Start Date']);
  const end   = parseSheetDate(raw['Program End Date']);
  const risk  = deriveRisk(raw, summary.gap);
  const archived = end != null && end.getTime() < today;
  return {
    delivery_id: String(raw['Delivery ID'] || '').trim(),
    client:      String(raw['Client Name']  || '').trim(),
    course:      String(raw['Course']       || '').trim(),
    domain:      String(raw['Domain']       || '').trim(),
    subdomain:   String(raw['Subdomain']    || '').trim(),
    start, end,
    type:   deriveType(raw),
    status: deriveStatus(raw),
    ta_required: summary.taReq,
    trainer_required: summary.trainerReq,
    required: summary.required,
    int_filled: summary.internal,
    fl_filled: summary.fl_filled,
    gap: summary.gap,
    risk,
    archived,
    raw,
  };
}

/* Find a raw track row by Delivery ID (case-insensitive, trimmed). */
export function findRawByDeliveryId(rows, deliveryId) {
  if (!rows || !deliveryId) return null;
  const target = String(deliveryId).trim().toLowerCase();
  for (const r of rows) {
    if (String(r?.['Delivery ID'] || '').trim().toLowerCase() === target) return r;
  }
  return null;
}
