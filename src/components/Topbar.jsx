import React from 'react';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PANEL_TITLES = {
  overview: 'Trainers Allocation',
  requirements: 'Requirements Hub',
  calendar: 'Session Calendar',
  pending: 'Pending Allocations',
  oasis: 'Oasis Capacity Stream',
  matrix: 'Trainer Engagement Matrix',
  clients: 'Client Directory',
  conflicts: 'Conflict Resolutions'
};

export default function Topbar({ user, activePanel }) {
  const title = PANEL_TITLES[activePanel] || 'Trainers Allocation';
  const name = user?.name || 'Madhesh P';
  const initials = getInitials(name);
  
  // Custom display role matching the mockup
  let displayRole = 'EMPLOYEE';
  if (user?.role) {
    const r = user.role.toLowerCase();
    if (r === 'admin') {
      displayRole = 'ADMIN';
    } else if (r === 'teamlead' || r === 'lead') {
      displayRole = 'EMPLOYEE';
    } else {
      displayRole = user.role.toUpperCase();
    }
  }

  // Get employee ID or fallback
  const empId = user?.employee_id || user?.employeeId || 'NEO10486';

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <h1 className="topbar-title">{title}</h1>
        <div className="topbar-subtitle">Q LABS TRAINING TEAM</div>
      </div>
      
      <div className="topbar-spacer" />
      
      <div className="topbar-profile">
        <div className="profile-info">
          <div className="profile-name">{name}</div>
          <div className="profile-meta">
            {empId} <span className="profile-dot-sep">•</span> {displayRole}
          </div>
        </div>
        
        <div className="profile-badge-wrapper">
          <div className="profile-badge">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
