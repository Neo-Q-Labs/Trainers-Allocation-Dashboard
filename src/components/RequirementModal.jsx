import { useEffect, useMemo, useState } from 'react';
import {
  parseSheetDate, fmtFull, windowLabel,
  parseNum,
  STATUS_TONE, TYPE_TONE,
} from '../lib/req.js';

/* ============================================================
   RequirementModal — shared detail drawer
   ------------------------------------------------------------
   Renders a single Request ID Track row (the one built by
   buildRequirementRow). Used from Requirements, Calendar,
   Clients, and Matrix so a programme always looks identical
   no matter where you drill in from.
   ============================================================ */

const META_KEYS     = ['Domain', 'Subdomain', 'Allocation Status', 'Training Status'];
const TIMELINE_KEYS = [];
const REQ_KEYS      = ['Total Trainer Required', "Total TA's Required", 'Internal', 'Existing Freelancers', 'New Freelancers Hired', 'New Freelancer Required', 'Risk'];
const PLANNED_KEYS  = ['Trainer planned', 'TA Planned'];

const TRAINER_POOL_FILTERS = ['ALL', 'WILP', 'INTERNAL', 'FREELANCER'];

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function poolBadgeFor(t, requirementType) {
  if (t.isWilp)        return { label: 'WILP', cls: 'rqd-pool-wilp' };
  if (t.isFreelancer)  return { label: 'FRL',  cls: 'rqd-pool-frl'  };
  if (t.isInternal)    return { label: 'INT',  cls: 'rqd-pool-int'  };
  if (requirementType === 'FREELANCER') return { label: 'FRL', cls: 'rqd-pool-frl' };
  if (requirementType === 'INTERNAL' || requirementType === 'MIXED') return { label: 'INT', cls: 'rqd-pool-int' };
  return { label: 'N/A', cls: 'rqd-pool-na' };
}

function rolePoolBadge(t) {
  return t.isTA
    ? { label: 'TA',      cls: 'rqd-role-ta' }
    : { label: 'Trainer', cls: 'rqd-role-tr' };
}

function poolKeyFor(t, requirementType) {
  if (t.isWilp)        return 'WILP';
  if (t.isFreelancer)  return 'FREELANCER';
  if (t.isInternal)    return 'INTERNAL';
  if (requirementType === 'FREELANCER') return 'FREELANCER';
  if (requirementType === 'INTERNAL' || requirementType === 'MIXED') return 'INTERNAL';
  return 'OTHER';
}

function extractTrainers(raw, wantBackup) {
  const out = [];
  for (const [key, val] of Object.entries(raw || {})) {
    if (val == null || String(val).trim() === '') continue;
    const k = String(key).toLowerCase();
    if (!/(trainer|^ta\b|\bta\s*\d|ta planned|backup)/i.test(k)) continue;
    if (/required|count|number|total|risk|status|pool/.test(k)) continue;
    const isBackup = /backup/i.test(key);
    if (isBackup !== !!wantBackup) continue;
    const s = String(val).trim();
    if (!s || /^\d+(\.\d+)?$/.test(s) || s === '—') continue;
    const parts = s.split(/[,;|\n]+|\s\/\s/).map((p) => p.trim()).filter((p) => p && !/^\d+$/.test(p));
    for (const name of parts) {
      out.push({
        name,
        sourceKey: key,
        isTA: /\bta\b/.test(k),
        isWilp: /wilp/i.test(name) || /wilp/i.test(key),
        isFreelancer: /freelanc|frl|external/i.test(name) || /freelanc|frl/i.test(key),
        isInternal: /\bint\b|internal/i.test(name) || /\binternal\b/.test(key),
        isBackup,
      });
    }
  }
  const seen = new Set();
  return out.filter((t) => {
    const sig = `${t.isTA}|${t.isBackup}|${t.name.toLowerCase()}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

export default function RequirementModal({ row, headers = [], onClose }) {
  const [trainerSearch, setTrainerSearch] = useState('');
  const [trainerPoolFilter, setTrainerPoolFilter] = useState('ALL');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!row) return null;

  const raw = row.raw || {};
  const cleanVal = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : '—');
  const valFor = (k) => {
    if (TIMELINE_KEYS.includes(k)) return fmtFull(parseSheetDate(raw[k]));
    if (/date/i.test(k)) {
      const d = parseSheetDate(raw[k]);
      if (d) return fmtFull(d);
    }
    return cleanVal(raw[k]);
  };

  const pick = (keys) => keys.filter((k) => k in raw).map((k) => ({ k, v: valFor(k) }));
  const meta = pick(META_KEYS);
  const req  = pick(REQ_KEYS);

  const HIDDEN_FIELDS = new Set([
    ...META_KEYS, ...TIMELINE_KEYS, ...REQ_KEYS, ...PLANNED_KEYS,
    'Delivery ID', 'Client Name', 'Course',
    'Program Start Date', 'Program End Date',
    'Allocation Status', 'Training Status',
  ]);
  const others = (headers.length ? headers : Object.keys(raw))
    .filter((h) => h && !h.startsWith('col_') && !/^\d+(\.\d+)?$/.test(h.trim()) && !HIDDEN_FIELDS.has(h) && h in raw && !/(trainer|^ta\s|ta planned|backup)/i.test(h))
    .map((k) => ({ k, v: valFor(k) }))
    .filter(({ v }) => v !== '—');

  const trainers       = useMemo(() => extractTrainers(raw, false), [raw]);
  const backupTrainers = useMemo(() => extractTrainers(raw, true),  [raw]);
  const ts = trainerSearch.trim().toLowerCase();
  const filterFn = (t) => {
    if (ts && !t.name.toLowerCase().includes(ts)) return false;
    if (trainerPoolFilter !== 'ALL' && poolKeyFor(t, row.type) !== trainerPoolFilter) return false;
    return true;
  };
  const visibleTrainers = trainers.filter(filterFn);
  const visibleBackups  = backupTrainers.filter(filterFn);

  const internalCount = parseNum(raw['Internal']);
  const freelancerCount = parseNum(raw['Existing Freelancers']) + parseNum(raw['New Freelancers Hired']);
  const trainerReq = parseNum(raw['Total Trainer Required']);
  const taReq = parseNum(raw["Total TA's Required"]);
  const gap = Math.max(0, (trainerReq + taReq) - (internalCount + freelancerCount));

  const TrainerTable = ({ list, isBackup = false }) => (
    <table className={`rqd-trainer-table${isBackup ? ' is-backup' : ''}`}>
      <thead>
        <tr>
          <th style={{ width: 36 }} />
          <th>Name</th>
          <th style={{ width: 90 }}>Pool</th>
          <th style={{ width: 100 }}>Role</th>
          <th>Source field</th>
        </tr>
      </thead>
      <tbody>
        {list.map((t, i) => {
          const pool = poolBadgeFor(t, row.type);
          const role = rolePoolBadge(t);
          return (
            <tr key={`${t.name}-${i}`}>
              <td><span className="rqd-trainer-avatar">{initials(t.name)}</span></td>
              <td className="rqd-trainer-table-name">{t.name}</td>
              <td><span className={`rqd-pool-badge ${pool.cls}`}>{pool.label}</span></td>
              <td><span className={`rqd-role-badge ${role.cls}`}>{role.label}</span></td>
              <td className="rqd-trainer-table-src">{t.sourceKey}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="oa-det-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="oa-det-panel is-wide" role="dialog" aria-modal="true" aria-label="Requirement detail">
        <div className="oa-det-head rqd-head">
          <div className="oa-det-avatar rqd-head-avatar" style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent2))' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: '#fff' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="13" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="rqd-head-info">
            <div className="rqd-head-title-row">
              <span className="rqd-head-title">{row.course || row.client || 'Requirement Details'}</span>
              {row.delivery_id && <>
                <span className="rqd-head-sep">|</span>
                <span className="rqd-head-id">{row.delivery_id}</span>
              </>}
              <span className="rqd-head-sep">|</span>
              <span className="rqd-head-window">{windowLabel(row.start, row.end)}</span>
              <span className={`rq-chip rq-chip-status-${STATUS_TONE[row.status]}`}><span className="rq-dot-mark" />{row.status}</span>
              <span className={`rq-chip rq-chip-${TYPE_TONE[row.type] || 'unassigned'}`}>{row.type}</span>
            </div>
          </div>
          <button type="button" className="oa-det-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="rqd-body">
          <div className="rqd-main">
            <div className="rqd-stats">
              <div className="rqd-stat is-internal">
                <div className="rqd-stat-label">Internal</div>
                <div className="rqd-stat-value">{internalCount}</div>
                <div className="rqd-stat-sub">Allocated from roster</div>
              </div>
              <div className="rqd-stat is-fl">
                <div className="rqd-stat-label">Freelancer</div>
                <div className="rqd-stat-value">{freelancerCount}</div>
                <div className="rqd-stat-sub">Existing + new hires</div>
              </div>
              <div className="rqd-stat is-total">
                <div className="rqd-stat-label">Trainers · TAs</div>
                <div className="rqd-stat-value">{trainerReq} · {taReq}</div>
                <div className="rqd-stat-sub">Required</div>
              </div>
              <div className="rqd-stat is-gap">
                <div className="rqd-stat-label">Open Gap</div>
                <div className="rqd-stat-value">{gap}</div>
                <div className="rqd-stat-sub">{gap === 0 ? 'Fully staffed' : 'Need fill'}</div>
              </div>
            </div>

            <div className="rqd-section">
              <div className="rqd-section-head">
                <div className="rqd-section-title">Assigned Trainers</div>
                <div className="rqd-pool-toggle" role="tablist" aria-label="Filter trainers by pool">
                  {TRAINER_POOL_FILTERS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      role="tab"
                      aria-selected={trainerPoolFilter === opt}
                      className={`rqd-pool-toggle-btn${trainerPoolFilter === opt ? ' is-active' : ''}`}
                      onClick={() => setTrainerPoolFilter(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="rqd-search">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="search"
                      placeholder="Search trainers…"
                      value={trainerSearch}
                      onChange={(e) => setTrainerSearch(e.target.value)}
                    />
                  </div>
                  <div className="rqd-section-count">{visibleTrainers.length}/{trainers.length}</div>
                </div>
              </div>
              {visibleTrainers.length ? (
                <TrainerTable list={visibleTrainers} />
              ) : (
                <div className="rqd-empty">
                  {trainers.length ? 'No matches for that search.' : 'No trainers assigned yet for this requirement.'}
                </div>
              )}
            </div>

            <div className="rqd-section">
              <div className="rqd-section-head">
                <div className="rqd-section-title">Backup Trainers</div>
                <div className="rqd-section-count">{visibleBackups.length}/{backupTrainers.length}</div>
              </div>
              {visibleBackups.length ? (
                <TrainerTable list={visibleBackups} isBackup />
              ) : (
                <div className="rqd-empty">
                  {backupTrainers.length ? 'No matches for that search.' : 'No backup trainers recorded.'}
                </div>
              )}
            </div>
          </div>

          <aside className="rqd-side">
            {meta.length > 0 && (
              <div className="rqd-mini-section">
                <div className="oa-det-sec-title">General Info</div>
                <div className="rqd-mini-grid">
                  {meta.map(({ k, v }) => (
                    <div key={k} className="rqd-mini-row">
                      <span className="rqd-mini-label">{k}</span>
                      <span className="rqd-mini-value">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {req.length > 0 && (
              <div className="rqd-mini-section">
                <div className="oa-det-sec-title">Staffing &amp; Risk</div>
                <div className="rqd-mini-grid">
                  {req.map(({ k, v }) => (
                    <div key={k} className="rqd-mini-row">
                      <span className="rqd-mini-label">{k}</span>
                      <span className="rqd-mini-value is-mono">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {others.length > 0 && (
              <div className="rqd-mini-section">
                <div className="oa-det-sec-title">Additional Fields</div>
                <div className="rqd-mini-grid">
                  {others.slice(0, 12).map(({ k, v }) => (
                    <div key={k} className="rqd-mini-row">
                      <span className="rqd-mini-label">{k}</span>
                      <span className="rqd-mini-value">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
