import { useState, useMemo } from 'react';
import { useGetTrainersQuery } from '../store/api.js';
import { LoadingPanel, ErrorPanel } from '../components/PanelState.jsx';

const STATUS_COLOR = {
  active: 'success',
  inactive: 'error',
  'on leave': 'warning',
  'on-leave': 'warning',
};

function statusClass(s) {
  return STATUS_COLOR[(s || '').toLowerCase()] || 'neutral';
}

function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const AVATAR_COLORS = [
  '#6366f1', '#22d3a5', '#f5c542', '#a855f7',
  '#ef4444', '#06b6d4', '#f97316', '#14b886',
];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function Trainers({ active }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [campusFilter, setCampusFilter] = useState('All');
  const [view, setView] = useState('cards');

  const { data, error, refetch } = useGetTrainersQuery({ limit: 500 });

  const trainers = data?.trainers || null;
  const headers = data?.headers || [];
  const total = data?.total ?? (trainers?.length ?? 0);
  const campuses = useMemo(
    () => [...new Set((trainers || []).map((t) => t.campus).filter(Boolean))].sort(),
    [trainers],
  );
  const statuses = useMemo(
    () => [...new Set((trainers || []).map((t) => t.status).filter(Boolean))].sort(),
    [trainers],
  );

  if (error) return <ErrorPanel panelId="trainers" active={active} error={error?.error || error?.message || 'Unknown error'} onRetry={() => refetch()} />;
  if (!trainers) return <LoadingPanel panelId="trainers" active={active} />;

  const filtered = trainers.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (t.name || '').toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q) ||
      (t.skills || '').toLowerCase().includes(q) ||
      (t.campus || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || (t.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchCampus = campusFilter === 'All' || (t.campus || '') === campusFilter;
    return matchSearch && matchStatus && matchCampus;
  });

  const activeCount = trainers.filter((t) => (t.status || '').toLowerCase() === 'active').length;
  const campusCount = new Set(trainers.map((t) => t.campus).filter(Boolean)).size;

  return (
    <section className={`panel${active ? ' active' : ''}`} data-panel="trainers">
      {/* KPI Strip */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-head">
            <div className="kpi-label">Total Trainers</div>
            <div className="kpi-icon purple">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div className="kpi-value">{total}<span className="unit">on roster</span></div>
          <div className="kpi-delta up">From Trainer Data Live</div>
        </div>

        <div className="kpi">
          <div className="kpi-head">
            <div className="kpi-label">Active Trainers</div>
            <div className="kpi-icon green">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <div className="kpi-value">{activeCount}<span className="unit">active</span></div>
          <div className="kpi-delta up">{total - activeCount} inactive / on leave</div>
        </div>

        <div className="kpi">
          <div className="kpi-head">
            <div className="kpi-label">Campuses Covered</div>
            <div className="kpi-icon blue">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
          </div>
          <div className="kpi-value">{campusCount}<span className="unit">locations</span></div>
          <div className="kpi-delta flat">Across all campuses</div>
        </div>

        <div className="kpi">
          <div className="kpi-head">
            <div className="kpi-label">Filtered Results</div>
            <div className="kpi-icon cyan">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>
          <div className="kpi-value">{filtered.length}<span className="unit">shown</span></div>
          <div className="kpi-delta flat">of {total} total</div>
        </div>
      </div>

      <div className="card">
        {/* Toolbar */}
        <div className="section-head">
          <div>
            <div className="section-title">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                <circle cx="17" cy="7" r="3" /><path d="M21 21v-2a3 3 0 0 0-3-3" />
              </svg>
              Trainer Roster
            </div>
            <div className="section-sub" style={{ marginTop: '6px' }}>{total} trainers from Trainer Data Live sheet</div>
          </div>
          <div className="section-actions">
            {/* Search */}
            <div className="input-wrap" style={{ width: '220px' }}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="input"
                placeholder="Search name, skill, campus..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status filter */}
            <div className="range-segment">
              {['All', ...statuses.slice(0, 4)].map((s) => (
                <button key={s} className={statusFilter === s ? 'active' : ''} onClick={() => setStatusFilter(s)}>
                  {s}
                </button>
              ))}
            </div>

            {/* Campus filter */}
            {campuses.length > 0 && (
              <select
                className="input"
                style={{ height: '32px', padding: '0 10px', minWidth: '150px' }}
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
              >
                <option value="All">All Campuses</option>
                {campuses.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {/* View toggle */}
            <div className="cal-view-toggle">
              <button className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')}>Cards</button>
              <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>Table</button>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            {total === 0
              ? 'No trainers found. The "Trainer Data Live" sheet may be empty or not yet synced.'
              : 'No trainers match the current filters.'}
          </div>
        )}

        {/* Card View */}
        {view === 'cards' && filtered.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '14px',
            padding: '4px 0',
          }}>
            {filtered.map((t, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'border-color 0.15s, transform 0.15s',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Avatar + Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: avatarColor(t.name),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '14px', color: '#fff', flexShrink: 0,
                  }}>
                    {initials(t.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                      {t.name}
                    </div>
                    {t.employee_id && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        #{t.employee_id}
                      </div>
                    )}
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span className={`chip ${statusClass(t.status)}`}>
                      <span className="chip-dot" />
                      {t.status || 'Active'}
                    </span>
                  </div>
                </div>

                {/* Meta rows */}
                {t.designation && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {t.designation}
                    {t.department ? ` · ${t.department}` : ''}
                  </div>
                )}

                {t.campus && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '11px', height: '11px' }}>
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    </svg>
                    {t.campus}
                  </div>
                )}

                {t.skills && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {t.skills.split(/[,;|]+/).slice(0, 4).map((sk, si) => (
                      <span key={si} style={{
                        background: 'rgba(99,102,241,0.12)',
                        color: '#818cf8',
                        borderRadius: '4px',
                        padding: '2px 7px',
                        fontSize: '10px',
                        fontWeight: 600,
                      }}>
                        {sk.trim()}
                      </span>
                    ))}
                    {t.skills.split(/[,;|]+/).length > 4 && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '2px 4px' }}>
                        +{t.skills.split(/[,;|]+/).length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {t.email && (
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    ✉ {t.email}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Table View */}
        {view === 'table' && filtered.length > 0 && (
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Campus</th>
                <th>Designation</th>
                <th>Skills</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, idx) => (
                <tr key={idx}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: avatarColor(t.name),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>{initials(t.name)}</div>
                      <strong style={{ fontSize: '12px' }}>{t.name}</strong>
                    </div>
                  </td>
                  <td className="mono" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{t.employee_id || '—'}</td>
                  <td>{t.campus || '—'}</td>
                  <td style={{ fontSize: '11px' }}>{t.designation || '—'}</td>
                  <td style={{ maxWidth: '200px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {t.skills ? t.skills.split(/[,;|]+/).slice(0, 3).join(', ') : '—'}
                  </td>
                  <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.email || '—'}</td>
                  <td>
                    <span className={`chip ${statusClass(t.status)}`}>
                      <span className="chip-dot" />
                      {t.status || 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
