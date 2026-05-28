import { useMemo } from 'react';

/* ============================================================
   Tile F · Skill × Type Heatmap
   ------------------------------------------------------------
   Rows = top N skill domains inferred from cell history
   Cols = trainer-type categories (FT / SME / WILP / FREELANCER)
   Cell colour = trainer-days delivered in that (skill × type)
   Cell click = toggles the page-level { skill, type } filter
   which other tiles consume to re-scope their data.
   ============================================================ */
const CATEGORY_ORDER = ['FT', 'SME', 'WILP', 'FREELANCER'];
const TYPE_COLOR = {
  FT: 'rgba(239, 68, 68, ',
  SME: 'rgba(155, 92, 246, ',
  WILP: 'rgba(99, 102, 241, ',
  FREELANCER: 'rgba(245, 158, 11, ',
};

// Same stopwords + tokeniser the OASIS backend uses — keeps "what's a skill"
// consistent across the app.
const STOPWORDS = new Set([
  'the', 'and', 'for', 'of', 'to', 'with', 'in', 'on', 'by',
  'training', 'trainer', 'trainers', 'ta', 'tas', 'backup',
  'fdp', 'course', 'program', 'phase', 'session', 'batch', 'sem', 'revision',
]);

const tokens = (text) => {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t && t.length >= 3 && !STOPWORDS.has(t));
};

export default function SkillTypeHeatmap({ days = [], filter, onToggle, maxSkills = 6 }) {
  // Aggregate: skillToken → typeBucket → trainer-day count
  const { matrix, skillOrder, max } = useMemo(() => {
    const m = new Map(); // skill → { FT,SME,WILP,FREELANCER }
    for (const d of days) {
      for (const o of (d.occupied || [])) {
        const type = CATEGORY_ORDER.includes(o.type) ? o.type : null;
        if (!type) continue;
        const toks = new Set(tokens(o.course));
        for (const t of toks) {
          if (!m.has(t)) m.set(t, { FT: 0, SME: 0, WILP: 0, FREELANCER: 0 });
          m.get(t)[type] += 1;
        }
      }
    }
    const arr = Array.from(m.entries()).map(([skill, row]) => ({
      skill,
      row,
      total: row.FT + row.SME + row.WILP + row.FREELANCER,
    }));
    arr.sort((a, b) => b.total - a.total);
    const top = arr.slice(0, maxSkills);
    const max = Math.max(1, ...top.flatMap(({ row }) => Object.values(row)));
    return { matrix: Object.fromEntries(top.map((r) => [r.skill, r.row])), skillOrder: top.map((r) => r.skill), max };
  }, [days, maxSkills]);

  if (skillOrder.length === 0) {
    return <div className="tcp-empty-tile">No skill activity in this range.</div>;
  }

  const cellFor = (skill, type) => {
    const v = matrix[skill]?.[type] || 0;
    const intensity = v / max;
    const isActive = filter && filter.skill === skill && filter.type === type;
    const bg = TYPE_COLOR[type] + (0.10 + intensity * 0.65).toFixed(2) + ')';
    return (
      <button
        key={`${skill}-${type}`}
        type="button"
        className={`tcp-sthm-cell${isActive ? ' is-active' : ''}`}
        style={{ background: v > 0 ? bg : 'rgba(255,255,255,0.02)' }}
        onClick={() => onToggle?.({ skill, type })}
        title={`${skill} × ${type} — ${v} trainer-day${v === 1 ? '' : 's'} · click to ${isActive ? 'clear' : 'filter'} other tiles`}
      >
        <span className="tcp-sthm-val">{v}</span>
      </button>
    );
  };

  return (
    <div className="tcp-sthm">
      <div className="tcp-sthm-grid">
        <div className="tcp-sthm-corner" />
        {CATEGORY_ORDER.map((t) => (
          <div key={t} className="tcp-sthm-col-head">{t}</div>
        ))}
        {skillOrder.map((skill) => (
          <div key={skill} style={{ display: 'contents' }}>
            <div className="tcp-sthm-row-head" title={skill}>{skill}</div>
            {CATEGORY_ORDER.map((t) => cellFor(skill, t))}
          </div>
        ))}
      </div>
      <div className="tcp-sthm-foot">
        {filter ? (
          <button type="button" className="tcp-sthm-clear" onClick={() => onToggle?.(filter)}>
            Clear filter — <strong>{filter.skill}</strong> × {filter.type}
          </button>
        ) : (
          <span className="tcp-sthm-hint">Click any cell to re-scope other tiles</span>
        )}
      </div>
    </div>
  );
}
