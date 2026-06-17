// CmdK is a stateful overlay; we render the static markup (with all the SVGs
// and command items as authored), and let the global script wire the
// input + click handlers via DOM (it queries by ID/class).

const html = `<div class="cmdk-backdrop" id="cmdkBackdrop">
  <div class="cmdk-panel" onclick="event.stopPropagation()">
    <div class="cmdk-input-row">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      <input class="cmdk-input" id="cmdkInput" placeholder="Search trainers, requirements, or run a command&#x2026;" autocomplete="off" />
      <span class="cmdk-esc">ESC</span>
    </div>
    <div class="cmdk-list" id="cmdkList">
      <div class="cmdk-group-title">Navigate</div>
      <div class="cmdk-item" data-target="overview"><div class="cmdk-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div><div class="cmdk-label">Dashboard<small>Overview &#xB7; KPIs &#xB7; pipeline</small></div><span class="cmdk-shortcut">G D</span></div>
      <div class="cmdk-item" data-target="requirements"><div class="cmdk-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg></div><div class="cmdk-label">Requirements<small>All Request IDs &#xB7; live + archived</small></div><span class="cmdk-shortcut">G R</span></div>
      <div class="cmdk-item" data-target="calendar"><div class="cmdk-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div><div class="cmdk-label">Calendar<small>Month &#xB7; Quarter &#xB7; Year &#xB7; Gantt</small></div><span class="cmdk-shortcut">G B</span></div>
      <div class="cmdk-item" data-target="pending"><div class="cmdk-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="cmdk-label">Pending Allocations<small>12 open slots awaiting trainer</small></div><span class="cmdk-shortcut">G N</span></div>
      <div class="cmdk-item" data-target="matrix"><div class="cmdk-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg></div><div class="cmdk-label">Matrix<small>Trainer &#xD7; day engagement</small></div><span class="cmdk-shortcut">G M</span></div>
      <div class="cmdk-item" data-target="clients"><div class="cmdk-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div><div class="cmdk-label">Client Snapshot<small>Per-client occupancy &#xB7; ranked</small></div><span class="cmdk-shortcut">G L</span></div>
      <div class="cmdk-item" data-target="conflicts"><div class="cmdk-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></div><div class="cmdk-label">Conflicts<small>7 open &#xB7; 3 critical</small></div><span class="cmdk-shortcut">G X</span></div>

      <div class="cmdk-group-title">Quick Actions</div>
      <div class="cmdk-item"><div class="cmdk-icon" style="background:rgba(34,211,165,0.12);color:var(--neon-green)"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div><div class="cmdk-label">New Requirement<small>Open Request ID entry form</small></div><span class="cmdk-shortcut">N R</span></div>
      <div class="cmdk-item"><div class="cmdk-icon" style="background:rgba(168,85,247,0.12);color:var(--neon-purple)"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div><div class="cmdk-label">Export Snapshot<small>This week's planner state to XLSX</small></div><span class="cmdk-shortcut">E X</span></div>
      <div class="cmdk-item"><div class="cmdk-icon" style="background:rgba(245,197,66,0.12);color:var(--neon-yellow)"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-15-6.7L3 8"/><path d="M3 4v4h4"/></svg></div><div class="cmdk-label">Refresh Live Sync<small>Re-pull from OneDrive Excel</small></div><span class="cmdk-shortcut">R S</span></div>

      <div class="cmdk-group-title">Trainers &#xB7; Recent</div>
      <div class="cmdk-item" data-target="matrix"><div class="cmdk-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg></div><div class="cmdk-label">Surya K<small>neo10376 &#xB7; Conflicted &#xB7; 96% load</small></div></div>
      <div class="cmdk-item" data-target="matrix"><div class="cmdk-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg></div><div class="cmdk-label">Sahil Deswal<small>neo10408 &#xB7; ML &#xB7; 94% load</small></div></div>
      <div class="cmdk-item" data-target="matrix"><div class="cmdk-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg></div><div class="cmdk-label">Abinaya P<small>neo10400 &#xB7; C/DSA &#xB7; 9% load &#xB7; idle</small></div></div>
    </div>
  </div>
</div>`;

export default function CmdK() {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
