// Sidebar navigation items + page metadata

const svgWrap = (inner) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:19px;height:19px;stroke:currentColor;">${inner}</svg>`;

export const NAV_ITEMS = [
  {
    target: 'overview',
    tip: 'Dashboard',
    active: true,
    icon: svgWrap(
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
    )
  },
  {
    target: 'requirements',
    tip: 'Requirements',
    icon: svgWrap(
      '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/>'
    )
  },
  {
    target: 'calendar',
    tip: 'Calendar',
    icon: svgWrap('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>')
  },
  {
    target: 'pending',
    tip: 'Pending Allocations',
    badge: 12,
    icon: svgWrap('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>')
  },
  { divider: true },
  {
    target: 'matrix',
    tip: 'Matrix',
    icon: svgWrap(
      '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="7" r="3"/><path d="M21 21v-2a3 3 0 0 0-3-3"/>'
    )
  },
  {
    target: 'clients',
    tip: 'Client Directory',
    icon: svgWrap(
      '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
    )
  },
  {
    target: 'conflicts',
    tip: 'Conflicts',
    badge: 7,
    icon: svgWrap(
      '<path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>'
    )
  },
  { divider: true },
  {
    target: 'oasis',
    tip: 'OASIS · Opportunity Assessment',
    icon: svgWrap(
      '<path d="M21 12a9 9 0 1 1-9-9"/><polyline points="21 4 21 12 13 12"/><circle cx="12" cy="12" r="3"/>'
    )
  }
];

const sw = (inner) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const PANEL_META = {
  overview: {
    crumb: 'Swift Ops / Planning / Dashboard',
    title: 'Dashboard',
    icon: sw(
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
    )
  },
  requirements: {
    crumb: 'Swift Ops / Planning / Requirements / Date-Wise Blocking',
    title: 'Date-Wise Blocking',
    icon: sw(
      '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/>'
    )
  },
  calendar: {
    crumb: 'Swift Ops / Planning / Calendar',
    title: 'Calendar',
    icon: sw('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>')
  },
  pending: {
    crumb: 'Swift Ops / Planning / Pending',
    title: 'Pending Allocations',
    icon: sw('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>')
  },
  matrix: {
    crumb: 'Swift Ops / Insights / Matrix',
    title: 'Trainer Matrix',
    icon: sw(
      '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="7" r="3"/><path d="M21 21v-2a3 3 0 0 0-3-3"/>'
    )
  },
  clients: {
    crumb: 'Swift Ops / Insights / Clients',
    title: 'Client Directory',
    icon: sw(
      '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
    )
  },
  conflicts: {
    crumb: 'Swift Ops / Insights / Conflicts',
    title: 'Active Conflict Resolution',
    icon: sw(
      '<path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>'
    )
  },
  oasis: {
    crumb: 'Swift Ops / Planning / OASIS',
    title: 'OASIS · Opportunity Assessment',
    icon: sw(
      '<path d="M21 12a9 9 0 1 1-9-9"/><polyline points="21 4 21 12 13 12"/><circle cx="12" cy="12" r="3"/>'
    )
  }
};
