// Auto-extracted runtime from qlabs-capacity-planner-v4.html.
// Wrapped as a module that exposes initApp() for React.

export function initApp(api = {}) {
const switchPanelCb = api.switchPanel || (() => {});

/* ============================================================
   Sidebar navigation · panel switching · breadcrumb sync
   ============================================================ */
const PANEL_META = {
  'overview':     { crumb: 'Swift Ops / Planning / Dashboard',         title: 'Trainer Capacity Planner',      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>' },
  'requirements': { crumb: 'Swift Ops / Planning / Requirements',      title: 'Active Request Pipeline',        icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>' },
  'calendar':     { crumb: 'Swift Ops / Planning / Calendar',          title: 'Calendar',                       icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' },
  'pending':      { crumb: 'Swift Ops / Planning / Pending',           title: 'Pending Allocations',            icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
  'oasis':        { crumb: 'Swift Ops / Planning / OASIS',             title: 'OASIS · Opportunity Assessment', icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>' },
  'replace':      { crumb: 'Swift Ops / Planning / Replacements',      title: 'Replacement Engine',             icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-15-6.7L3 8"/><path d="M3 4v4h4"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/><path d="M21 20v-4h-4"/></svg>' },
  'matrix':       { crumb: 'Swift Ops / Insights / Matrix',            title: 'Trainer Matrix',                 icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="7" r="3"/><path d="M21 21v-2a3 3 0 0 0-3-3"/></svg>' },
  'clients':      { crumb: 'Swift Ops / Insights / Clients',           title: 'Client Snapshot',                icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
  'conflicts':    { crumb: 'Swift Ops / Insights / Conflicts',         title: 'Active Conflict Resolution',     icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>' },
  'workload':     { crumb: 'Swift Ops / Insights / Workload',          title: 'Workload Analytics & Forecast',  icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 14 4-4 4 4 5-5"/></svg>' }
};

function switchPanel(target) {
  if (!target || !PANEL_META[target]) return;
  // React owns sidebar + panel.active + page-head state — delegate to it.
  switchPanelCb(target);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (target === 'workload') buildLoadHistogram();
}
window.qlabs = window.qlabs || {};
window.qlabs.switchPanel = switchPanel;

// React owns sidebar nav click handling; nothing to bind here.

/* ============================================================
   Command Palette · ⌘ K
   ============================================================ */
const cmdkBackdrop = document.getElementById('cmdkBackdrop');
const cmdkInput    = document.getElementById('cmdkInput');

function openCmdk() {
  if (!cmdkBackdrop) return;
  cmdkBackdrop.classList.add('open');
  setTimeout(() => cmdkInput && cmdkInput.focus(), 50);
}
function closeCmdk() {
  if (!cmdkBackdrop) return;
  cmdkBackdrop.classList.remove('open');
  if (cmdkInput) cmdkInput.value = '';
  filterCmdk('');
}
window.qlabs.openCmdk = openCmdk;
window.qlabs.closeCmdk = closeCmdk;

document.getElementById('cmdkTrigger')   ?.addEventListener('click', openCmdk);
document.getElementById('cmdkTriggerBtn')?.addEventListener('click', openCmdk);
cmdkBackdrop?.addEventListener('click', closeCmdk);

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    cmdkBackdrop.classList.contains('open') ? closeCmdk() : openCmdk();
  } else if (e.key === 'Escape' && cmdkBackdrop.classList.contains('open')) {
    closeCmdk();
  }
});

document.querySelectorAll('.cmdk-item').forEach(item => {
  item.addEventListener('click', () => {
    const target = item.dataset.target;
    if (target) switchPanel(target);
    closeCmdk();
  });
});

function filterCmdk(q) {
  const query = q.trim().toLowerCase();
  document.querySelectorAll('.cmdk-item').forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = (query === '' || text.includes(query)) ? '' : 'none';
  });
  document.querySelectorAll('.cmdk-group-title').forEach(title => {
    let sib = title.nextElementSibling;
    let anyVisible = false;
    while (sib && !sib.classList.contains('cmdk-group-title')) {
      if (sib.style.display !== 'none') { anyVisible = true; break; }
      sib = sib.nextElementSibling;
    }
    title.style.display = anyVisible ? '' : 'none';
  });
}

cmdkInput?.addEventListener('input', (e) => filterCmdk(e.target.value));

/* ============================================================
   Workload histogram (lazy-rendered on first visit)
   ============================================================ */
let _histRendered = false;
window.qlabs.buildLoadHistogram = buildLoadHistogram;
function buildLoadHistogram() {
  if (_histRendered) return;
  const el = document.getElementById('loadHist');
  if (!el) return;

  const buckets = [
    { x: '0–10%',   n: 17, cls: 'low'  },
    { x: '10–20%',  n: 22, cls: 'low'  },
    { x: '20–30%',  n: 31, cls: 'low'  },
    { x: '30–40%',  n: 38, cls: 'low'  },
    { x: '40–50%',  n: 42, cls: ''     },
    { x: '50–60%',  n: 35, cls: ''     },
    { x: '60–75%',  n: 28, cls: ''     },
    { x: '75–85%',  n: 22, cls: ''     },
    { x: '85–95%',  n: 11, cls: 'warn' },
    { x: '95%+',    n:  8, cls: 'crit' }
  ];
  const max = Math.max(...buckets.map(b => b.n));
  const H = 200;
  el.innerHTML = buckets.map(b => {
    const h = (b.n / max) * (H - 24);
    return `
      <div class="hist-col">
        <div class="hist-bar ${b.cls}" style="height:${h}px">
          <span class="n">${b.n}</span>
        </div>
        <div class="hist-x">${b.x}</div>
      </div>
    `;
  }).join('');
  _histRendered = true;
}

/* ============================================================
   Stack chart (Demand vs Capacity) — with wavy capacity
   ============================================================ */
(function buildStack() {
  const chart = document.getElementById('stackChart');
  if (!chart) return;

  // 30 days of demand + capacity data. Internal capacity is steady ~28
  // (28 internal trainers in pool, minus a couple for SME owed leaves).
  // Freelancer/contract availability varies daily based on engagement.
  const demandData = [
    {d:22,m:'May',i:4, f:5, t:3,  capI:28, capF:14},
    {d:23,m:'May',i:0, f:0, t:0,  capI: 8, capF: 4},
    {d:24,m:'May',i:0, f:0, t:0,  capI: 8, capF: 3},
    {d:25,m:'May',i:8, f:4, t:2,  capI:28, capF:13},
    {d:26,m:'May',i:7, f:5, t:3,  capI:28, capF:15},
    {d:27,m:'May',i:7, f:5, t:3,  capI:28, capF:14},
    {d:28,m:'May',i:7, f:5, t:3,  capI:27, capF:11},
    {d:29,m:'May',i:7, f:5, t:3,  capI:26, capF:10},
    {d:30,m:'May',i:0, f:0, t:0,  capI: 8, capF: 4},
    {d:31,m:'May',i:0, f:0, t:0,  capI: 8, capF: 3},
    {d:1, m:'Jun',i:12,f:8, t:4,  capI:28, capF:18},
    {d:2, m:'Jun',i:14,f:11,t:5,  capI:28, capF:17},
    {d:3, m:'Jun',i:18,f:13,t:6,  capI:28, capF:19},
    {d:4, m:'Jun',i:16,f:14,t:6,  capI:28, capF:21},
    {d:5, m:'Jun',i:17,f:15,t:6,  capI:28, capF:20},
    {d:6, m:'Jun',i:0, f:0, t:0,  capI: 8, capF: 5},
    {d:7, m:'Jun',i:0, f:0, t:0,  capI: 8, capF: 4},
    {d:8, m:'Jun',i:18,f:13,t:5,  capI:28, capF:16},
    {d:9, m:'Jun',i:20,f:14,t:5,  capI:28, capF:18},
    {d:10,m:'Jun',i:22,f:12,t:6,  capI:27, capF:14},
    {d:11,m:'Jun',i:25,f:14,t:7,  capI:27, capF:13},
    {d:12,m:'Jun',i:24,f:15,t:7,  capI:26, capF:11},
    {d:13,m:'Jun',i:0, f:0, t:0,  capI: 8, capF: 4},
    {d:14,m:'Jun',i:0, f:0, t:0,  capI: 8, capF: 4},
    {d:15,m:'Jun',i:21,f:13,t:5,  capI:28, capF:15},
    {d:16,m:'Jun',i:18,f:11,t:4,  capI:28, capF:16},
    {d:17,m:'Jun',i:24,f:11,t:6,  capI:28, capF:14},
    {d:18,m:'Jun',i:22,f:9, t:5,  capI:27, capF:12},
    {d:19,m:'Jun',i:20,f:8, t:5,  capI:26, capF:10},
    {d:20,m:'Jun',i:0, f:0, t:0,  capI: 8, capF: 4}
  ];

  const maxValue = 56;     // y-axis ceiling
  const chartH   = 186;    // px

  // Build bars
  chart.innerHTML = demandData.map(d => {
    const iH = (d.i / maxValue) * chartH;
    const fH = (d.f / maxValue) * chartH;
    const tH = (d.t / maxValue) * chartH;
    const total = d.i + d.f + d.t;
    const cap = d.capI + d.capF;
    const over = total > cap;
    const label = (d.d === 1 ? `1 ${d.m}` : d.d);
    return `
      <div class="stack-col" data-cap="${cap}" data-tot="${total}" ${over ? 'data-over="1"' : ''}>
        <div class="stack-bars" style="height:${chartH}px;">
          <div class="sb dem-internal" style="height:${iH}px" data-tip="Internal: ${d.i}"></div>
          <div class="sb dem-freelancer" style="height:${fH}px" data-tip="Freelancer: ${d.f}"></div>
          <div class="sb dem-ta" style="height:${tH}px" data-tip="TA: ${d.t}"></div>
        </div>
        <div class="stack-x-label">${label}</div>
      </div>
    `;
  }).join('');

  // Wait one tick for layout, then draw SVG overlay
  requestAnimationFrame(() => {
    const cols = chart.querySelectorAll('.stack-col');
    if (!cols.length) return;

    const chartRect = chart.getBoundingClientRect();
    const W = chartRect.width;
    const H = chartRect.height;
    const TOP_PAD = 14;        // matches .stack-chart padding-top
    const BOT_PAD = 22;        // matches .stack-chart padding-bottom (x-axis label area)
    const innerH = H - TOP_PAD - BOT_PAD;

    // x-positions are the centers of each stack-col
    const points = [];
    cols.forEach(col => {
      const r = col.getBoundingClientRect();
      const x = (r.left - chartRect.left) + r.width / 2;
      const cap = parseFloat(col.dataset.cap) || 0;
      const y = TOP_PAD + (1 - cap / maxValue) * innerH;
      points.push({ x, y, cap });
    });

    // Smooth path through points (Catmull-Rom→bezier)
    function smoothPath(pts) {
      if (pts.length < 2) return '';
      let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
      return d;
    }

    const linePath = smoothPath(points);
    const baselineY = TOP_PAD + innerH;
    const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baselineY.toFixed(1)} L ${points[0].x.toFixed(1)} ${baselineY.toFixed(1)} Z`;

    // Build the SVG
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'capacity-svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    // Gradient for area fill
    const defs = document.createElementNS(svgNS, 'defs');
    defs.innerHTML = `
      <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#EF4444" stop-opacity="0.55"/>
        <stop offset="1" stop-color="#EF4444" stop-opacity="0"/>
      </linearGradient>`;
    svg.appendChild(defs);

    // Area fill
    const areaEl = document.createElementNS(svgNS, 'path');
    areaEl.setAttribute('d', areaPath);
    areaEl.setAttribute('class', 'cap-area');
    svg.appendChild(areaEl);

    // Line
    const lineEl = document.createElementNS(svgNS, 'path');
    lineEl.setAttribute('d', linePath);
    lineEl.setAttribute('class', 'cap-line');
    svg.appendChild(lineEl);

    // Dots at each capacity point
    points.forEach(p => {
      const c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', p.x.toFixed(1));
      c.setAttribute('cy', p.y.toFixed(1));
      c.setAttribute('r', '1.8');
      c.setAttribute('class', 'cap-dot');
      svg.appendChild(c);
    });

    chart.appendChild(svg);

    // Floating label
    const lbl = document.createElement('div');
    lbl.className = 'cap-label';
    lbl.textContent = 'AVAILABLE CAPACITY';
    chart.appendChild(lbl);

    // Internal-only capacity band (steady ~28 line, dashed)
    const avgCapI = 28;
    const yI = TOP_PAD + (1 - avgCapI / maxValue) * innerH;
    const band = document.createElement('div');
    band.className = 'cap-internal-band';
    band.style.top = yI + 'px';
    band.style.height = (baselineY - yI) + 'px';
    chart.appendChild(band);

    const intLbl = document.createElement('div');
    intLbl.className = 'cap-internal-label';
    intLbl.textContent = 'INTERNAL POOL · ~28';
    intLbl.style.top = (yI - 16) + 'px';
    chart.appendChild(intLbl);
  });
})();

/* ============================================================
   Date grid (Date-Wise Blocking panel)
   ============================================================ */
/* ============================================================
   Calendar — Month / Quarter / Year views
   ============================================================ */
(function buildCalendar() {
  const wrap      = document.getElementById('calWrap');
  const monthLbl  = document.getElementById('calMonthLabel');
  const prevBtn   = document.getElementById('calPrev');
  const nextBtn   = document.getElementById('calNext');
  const todayBtn  = document.getElementById('calToday');
  const weekGrid  = document.getElementById('weekGrid');
  const weekProgs = document.getElementById('weekProgs');
  const weekLabel = document.getElementById('weekLabel');
  const weekPrev  = document.getElementById('weekPrev');
  const weekNext  = document.getElementById('weekNext');
  if (!wrap) return;

  // Each event now has track (k) AND client (c).
  // Tracks: dsa apt fs cloud cy sap py · Clients: parul skg lti kct hex iamneo
  const DAY_DATA = {
    '2026-5-22': { demand:4,  events:[{t:'VIT-WILP exam',           k:'fs',  c:'iamneo'}] },
    '2026-5-25': { demand:8,  events:[{t:'VIT-WILP exam',           k:'fs',  c:'iamneo'},{t:'Parul prep',           k:'dsa', c:'parul'}] },
    '2026-5-26': { demand:12, events:[{t:'VIT-WILP exam',           k:'fs',  c:'iamneo'},{t:'NerdX kickoff',        k:'dsa', c:'skg'  },{t:'SKG prep',     k:'dsa', c:'skg'}] },
    '2026-5-27': { demand:14, events:[{t:'VIT-WILP exam',           k:'fs',  c:'iamneo'},{t:'NerdX',                k:'dsa', c:'skg'  },{t:'SKI-099 mock', k:'apt', c:'skg'}] },
    '2026-5-28': { demand:14, events:[{t:'NerdX',                   k:'dsa', c:'skg'   },{t:'SKI-099 mock',         k:'apt', c:'skg'  }] },
    '2026-5-29': { demand:14, events:[{t:'NerdX',                   k:'dsa', c:'skg'   },{t:'SKI-099 mock',         k:'apt', c:'skg'  }] },
    '2026-6-1':  { demand:24, events:[{t:'Parul-135 starts',        k:'dsa', c:'parul' },{t:'NerdX',                k:'dsa', c:'skg'  }] },
    '2026-6-2':  { demand:30, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'LTIM-024',             k:'fs',  c:'lti'  },{t:'NerdX',        k:'dsa', c:'skg'}] },
    '2026-6-3':  { demand:37, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'SKI-100 begins',       k:'dsa', c:'skg'  },{t:'LTIM-024',     k:'fs',  c:'lti'},{t:'SKI-099',k:'apt',c:'skg'}] },
    '2026-6-4':  { demand:36, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'SKI-100',              k:'dsa', c:'skg'  },{t:'LTIM-024',     k:'fs',  c:'lti'}] },
    '2026-6-5':  { demand:38, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'SKI-100',              k:'dsa', c:'skg'  },{t:'LTIM-024',     k:'fs',  c:'lti'},{t:'HEX-B3',k:'py',c:'hex'}] },
    '2026-6-8':  { demand:36, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'SKI-100',              k:'dsa', c:'skg'  },{t:'LTIM-024',     k:'fs',  c:'lti'}] },
    '2026-6-9':  { demand:39, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'SKI-100',              k:'dsa', c:'skg'  },{t:'LTIM-Mumbai',  k:'fs',  c:'lti'}] },
    '2026-6-10': { demand:40, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'SKI-100',              k:'dsa', c:'skg'  },{t:'SKG-ML-S5',    k:'py',  c:'skg'}] },
    '2026-6-11': { demand:46, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'SKI-100',              k:'dsa', c:'skg'  },{t:'LTIM-027',     k:'cloud',c:'lti'},{t:'SKG-ML',k:'py',c:'skg'}] },
    '2026-6-12': { demand:46, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'SKI-100',              k:'dsa', c:'skg'  },{t:'LTIM-027',     k:'cloud',c:'lti'}] },
    '2026-6-15': { demand:39, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'SKI-100',              k:'dsa', c:'skg'  },{t:'SKG-CS-S6',    k:'cy',  c:'skg'}] },
    '2026-6-16': { demand:33, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'SKI-100',              k:'dsa', c:'skg'  },{t:'SKG-CS',       k:'cy',  c:'skg'}] },
    '2026-6-17': { demand:41, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'SKI-100',              k:'dsa', c:'skg'  },{t:'REC-001 prep', k:'fs',  c:'iamneo'},{t:'SKG-CS',k:'cy',c:'skg'}] },
    '2026-6-18': { demand:36, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'REC-001',              k:'fs',  c:'iamneo'},{t:'SKG-CS',     k:'cy',  c:'skg'}] },
    '2026-6-19': { demand:32, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'REC-001',              k:'fs',  c:'iamneo'},{t:'LTIM-Bhub',   k:'fs',  c:'lti'}] },
    '2026-6-22': { demand:36, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'LTM-001 starts',       k:'cy',  c:'lti'  },{t:'REC-001',     k:'fs',  c:'iamneo'}] },
    '2026-6-23': { demand:38, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'LTM-001',              k:'cy',  c:'lti'  },{t:'REC-001',     k:'fs',  c:'iamneo'}] },
    '2026-6-24': { demand:36, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'LTM-001',              k:'cy',  c:'lti'  },{t:'REC-001 closes',k:'fs', c:'iamneo'}] },
    '2026-6-25': { demand:32, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'LTM-001',              k:'cy',  c:'lti'  }] },
    '2026-6-26': { demand:30, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'LTM-001',              k:'cy',  c:'lti'  },{t:'SKG-CS closes',k:'cy',c:'skg'}] },
    '2026-6-29': { demand:24, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'LTM-001',              k:'cy',  c:'lti'  },{t:'KCT-MS prep', k:'dsa', c:'kct'}] },
    '2026-6-30': { demand:24, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'LTM-001',              k:'cy',  c:'lti'  }] },
    '2026-7-4':  { demand:28, events:[{t:'KCT NerdX MS B1',         k:'dsa', c:'kct'   },{t:'KCT NerdX MS B2',      k:'dsa', c:'kct'  },{t:'Parul-135',   k:'dsa', c:'parul'}] },
    '2026-7-10': { demand:24, events:[{t:'KCT NerdX',               k:'dsa', c:'kct'   },{t:'Parul-135',            k:'dsa', c:'parul'}] },
    '2026-7-15': { demand:22, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'Parul MBA SAP',        k:'sap', c:'parul'}] },
    '2026-7-18': { demand:20, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'KCT NerdX closes',     k:'dsa', c:'kct'  }] },
    '2026-7-22': { demand:18, events:[{t:'Parul-135',               k:'dsa', c:'parul' },{t:'Parul MBA SAP',        k:'sap', c:'parul'}] },
    '2026-7-29': { demand:14, events:[{t:'Parul-135',               k:'dsa', c:'parul' }] }
  };
  const CAPACITY = 42;

  const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const DOW_S = ['S','M','T','W','T','F','S'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // State
  const today = new Date(2026, 4, 22);            // 22 May 2026
  let cursor = new Date(today.getFullYear(), today.getMonth(), 1);
  let view = 'month';
  let selectedDate = new Date(today);             // Drives the week panel below
  let trackFilter = 'all';
  let clientFilter = 'all';

  function key(d) { return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
  function isSameDate(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function loadLevel(demand) {
    if (demand === 0) return 'l0';
    if (demand <= 8)  return 'l1';
    if (demand <= 20) return 'l2';
    if (demand <= 35) return 'l3';
    if (demand <= CAPACITY) return 'l4';
    return 'l5';
  }
  function passesFilters(evt) {
    if (trackFilter !== 'all'  && evt.k !== trackFilter)  return false;
    if (clientFilter !== 'all' && evt.c !== clientFilter) return false;
    return true;
  }
  function filteredData(d) {
    const data = DAY_DATA[key(d)] || { demand: 0, events: [] };
    if (trackFilter === 'all' && clientFilter === 'all') return data;
    const events = data.events.filter(passesFilters);
    // Scale demand proportionally to filtered events
    const ratio = data.events.length > 0 ? events.length / data.events.length : 0;
    return { demand: Math.round(data.demand * ratio), events };
  }

  // -- Month view --
  function renderMonth(monthDate) {
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const first = new Date(y, m, 1);
    const startOffset = first.getDay();

    let html = '';
    DOW.forEach((d, i) => {
      const we = (i === 0 || i === 6) ? ' we' : '';
      html += `<div class="cal-dow${we}">${d}</div>`;
    });

    for (let i = 0; i < 42; i++) {
      const dayNum = i - startOffset + 1;
      const cellDate = new Date(y, m, dayNum);
      const inMonth = (cellDate.getMonth() === m);
      const dow = cellDate.getDay();
      const isWE = (dow === 0 || dow === 6);
      const isToday = isSameDate(cellDate, today);
      const data = filteredData(cellDate);

      let stateCls = '';
      if (!inMonth) stateCls += ' out';
      if (isWE) stateCls += ' weekend';
      if (isToday) stateCls += ' today';
      if (data.demand > CAPACITY) stateCls += ' over';
      else if (data.demand >= 35) stateCls += ' warn';

      const events = data.events.slice(0, 3).map(e => `<div class="cal-event ${e.k}">${e.t}</div>`).join('');
      const extra  = data.events.length > 3 ? `<div class="cal-event-more">+${data.events.length - 3} more</div>` : '';
      const loadCls = data.demand > CAPACITY ? 'over' : (data.demand >= 35 ? 'warn' : '');
      const tag = data.demand > CAPACITY
        ? '<span class="cal-day-tag over">OVER</span>'
        : (data.demand >= 35 ? '<span class="cal-day-tag warn">PEAK</span>' : '');

      html += `
        <div class="cal-day${stateCls}" data-date="${key(cellDate)}">
          <div class="cal-day-head">
            <div class="cal-day-num">${cellDate.getDate()}</div>
            ${tag}
          </div>
          <div class="cal-events">
            ${events}
            ${extra}
          </div>
          ${data.demand > 0 ? `<div class="cal-day-bottom"><span class="cal-day-load ${loadCls}">${data.demand} / ${CAPACITY}</span></div>` : ''}
        </div>`;
    }
    return `<div class="cal-month">${html}</div>`;
  }

  // -- Mini month (quarter + year) --
  function renderMini(monthDate) {
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const first = new Date(y, m, 1);
    const startOffset = first.getDay();

    let html = '';
    DOW_S.forEach(d => html += `<div class="cal-mini-dow">${d}</div>`);
    for (let i = 0; i < 42; i++) {
      const dayNum = i - startOffset + 1;
      const cellDate = new Date(y, m, dayNum);
      const inMonth = (cellDate.getMonth() === m);
      const isToday = isSameDate(cellDate, today);
      const data = filteredData(cellDate);
      const lvl = loadLevel(data.demand);
      let cls = `cal-mini-day ${lvl}`;
      if (!inMonth) cls += ' out';
      if (isToday) cls += ' today';
      html += `<div class="${cls}" data-date="${key(cellDate)}" title="${cellDate.toDateString()} · ${data.demand} demand">${cellDate.getDate()}</div>`;
    }
    return `<div class="cal-mini">
      <div class="cal-mini-title">${MONTHS_SHORT[m]} ${y}</div>
      <div class="cal-mini-grid">${html}</div>
    </div>`;
  }

  function renderQuarter(monthDate) {
    const y = monthDate.getFullYear();
    const qStart = Math.floor(monthDate.getMonth() / 3) * 3;
    let html = '';
    for (let i = 0; i < 3; i++) html += renderMini(new Date(y, qStart + i, 1));
    return `<div class="cal-quarter">${html}</div>`;
  }

  function renderYear(monthDate) {
    const y = monthDate.getFullYear();
    let html = '';
    for (let i = 0; i < 12; i++) html += renderMini(new Date(y, i, 1));
    return `<div class="cal-year">${html}</div>`;
  }

  // -- Gantt view (trainer-rows × 28 days, Nexus-style) --
  // Bars are positioned via grid-column "start / span N" on a 28-col track.
  // Day index 1 = today (Friday 22 May 2026); day index 28 = 18 Jun 2026.
  function renderGantt() {
    // Day labels
    const ganttStart = new Date(today);
    const days = [];
    for (let i = 0; i < 28; i++) {
      const d = new Date(ganttStart);
      d.setDate(ganttStart.getDate() + i);
      days.push(d);
    }

    // Each trainer = a row. Deliveries = bars with [trackKey, programmeName, dayStart, daySpan].
    // dayStart is 1-based (1 = today).
    const trainers = [
      { name:'Azhagu Venkadesh SV',     id:'neo10153', type:'Internal-SME',     bars:[
        ['fs',    'Cloud AWS - Trainer',         5, 4],
        ['fs',    'Cloud A...',                  10,2],
        ['fs',    'Cloud A...',                  13,2],
        ['fs',    'Cloud AWS - Trainer',         16,6]
      ]},
      { name:'Anthony Sahaya Michael M',id:'neo10166', type:'Internal-SME',     bars:[
        ['py',    'LTIM-Virtual Internship JAVA',1, 5],
        ['py',    'LTIM-Virtual Internship JAVA',8, 5],
        ['py',    'L...',                        14,1],
        ['cy',    'GenAI Java',                  17,3]
      ]},
      { name:'Aravindhan S',             id:'neo10172', type:'Internal-Fulltime',bars:[
        ['py',    'KCT-Python Programming-Trainer',1, 4],
        ['py',    'KCT-Python Pro...',           7, 3],
        ['sap',   'NerdX-Trainer',               17,11]
      ]},
      { name:'Karan Dharmalingam',       id:'neo10265', type:'Internal-SME',     bars:[
        ['sap',   'GenAI - ...',                 11,3]
      ]},
      { name:'Kumar Raghuveer Royal Amara',id:'neo10320',type:'Internal-Fulltime',bars:[
        ['fs',    'D&A-Foundation Phase',        13,5],
        ['dsa',   'N...',                        19,2],
        ['fs',    'D&A-Foundation Phase',        21,7]
      ]},
      { name:'Surya K',                  id:'neo10376', type:'Internal-Fulltime',bars:[
        ['apt',   'JAVA Full Stack-TA',          15,13]
      ]},
      { name:'Karunya Mohan',            id:'neo10396', type:'Internal-Fulltime',bars:[
        ['py',    'KCT-Python Programming-Trainer',1, 4],
        ['py',    'KCT-Python Pro...',           7, 3]
      ]},
      { name:'Abinaya P',                id:'neo10400', type:'Internal-Fulltime',bars:[
        ['py',    'KCT-Python Programming-Trainer',1, 4],
        ['py',    'KCT-Python Pro...',           7, 3]
      ]},
      { name:'Manoj Kumar',              id:'neo10402', type:'Internal-Fulltime',bars:[
        ['py',    'LTI Bhubaneshwar- JAVA FS-Trainer',1,4],
        ['py',    'LTI Bhub...',                  6,2],
        ['cy',    'JAVA Full Stack-Trainer',     13,15]
      ]},
      { name:'Harshada Surendra Rajput', id:'neo10420', type:'Internal-Fulltime',bars:[
        ['cy',    'SDET-JAVA-TA',                13,7],
        ['dsa',   'N...',                        20,2],
        ['cy',    'SDET-JAVA-TA',                22,6]
      ]},
      { name:'Harsha AB',                id:'neo10525', type:'Internal-Fulltime',bars:[
        ['sap',   'NerdX-Trainer',               17,10],
        ['dsa',   'N...',                        27,2]
      ]},
      { name:'Shubhi Tiwari',            id:'neo10411', type:'Internal-WILP',    bars:[
        ['cloud', 'E...',                        18,1],
        ['dsa',   'N...',                        20,2],
        ['cloud', 'Exam Reporting: VIT',         22,5],
        ['dsa',   'N...',                        27,2]
      ]},
      { name:'Yogeshwaran Kumaran',      id:'neo10417', type:'Internal-WILP',    bars:[
        ['sap',   'M...',                        4, 2],
        ['sap',   'M...',                        8, 2],
        ['cloud', 'E...',                        18,1],
        ['dsa',   'N...',                        20,2],
        ['cloud', 'Exam Reporting: VIT',         22,5],
        ['dsa',   'N...',                        27,2]
      ]},
      { name:'Subash K',                 id:'neo10421', type:'Internal-WILP',    bars:[
        ['sap',   'M...',                        4, 2],
        ['sap',   'M...',                        8, 2],
        ['cloud', 'E...',                        18,1],
        ['dsa',   'N...',                        20,2],
        ['cloud', 'Exam Reporting: VIT',         22,5],
        ['dsa',   'N...',                        27,2]
      ]}
    ];

    const headHTML = `
      <div class="cgg-search-bar">
        <div class="input-wrap" style="width:340px">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="input" placeholder="Search trainer by name or TVA ID...">
        </div>
        <div class="cgg-engage-toggle">
          <button class="active" data-eg="engaged">Engaged</button>
          <button data-eg="all">All</button>
        </div>
        <div class="cgg-engage-meta"><b>${trainers.length}</b> trainers · <b>28</b> days</div>
      </div>
    `;

    let dayHeader = `<div class="cgg-head-trainer">Trainer</div>`;
    for (let i = 0; i < 28; i++) {
      const d = days[i];
      const isWE = d.getDay() === 0 || d.getDay() === 6;
      const isTd = isSameDate(d, today);
      let cls = '';
      if (isWE) cls += ' weekend';
      if (isTd) cls += ' today';
      dayHeader += `<div class="cgg-head-day${cls}">${DOW[d.getDay()][0]}<strong>${d.getDate()}</strong></div>`;
    }

    let rowsHTML = '';
    trainers.forEach(t => {
      let bars = t.bars.map(([k, name, start, span]) =>
        `<div class="cgg-bar t-${k}" style="grid-column: ${start} / span ${span}" data-trainer="${t.name}" data-prog="${name}">${name}</div>`
      ).join('');
      rowsHTML += `
        <div class="cgg-row">
          <div class="cgg-row-name">
            <span class="n">${t.name}</span>
            <span class="s">${t.id} · ${t.type}</span>
          </div>
          <div class="cgg-row-track">
            ${bars}
            <div class="cgg-today-line" style="left: 0"></div>
          </div>
        </div>`;
    });

    return `<div class="cal-gantt">
      ${headHTML}
      <div class="cgg-head">${dayHeader}</div>
      ${rowsHTML}
    </div>`;
  }

  // -- Week panel (driven by selectedDate) --
  function renderWeek() {
    if (!weekGrid) return;
    const dow = selectedDate.getDay();
    const weekStart = new Date(selectedDate);
    weekStart.setDate(selectedDate.getDate() - dow); // Sunday of that week

    // Week label
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    const lblStart = weekStart.getDate();
    const lblEnd   = end.getDate();
    const lblMo1   = MONTHS_SHORT[weekStart.getMonth()];
    const lblMo2   = MONTHS_SHORT[end.getMonth()];
    const sameMo   = weekStart.getMonth() === end.getMonth();
    weekLabel.textContent = sameMo
      ? `${lblStart}–${lblEnd} ${lblMo1} ${weekStart.getFullYear()}`
      : `${lblStart} ${lblMo1} – ${lblEnd} ${lblMo2} ${weekStart.getFullYear()}`;

    // Per-day cells
    let cellsHTML = '';
    const seenProgs = new Map();
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const isToday = isSameDate(d, today);
      const isWE = d.getDay() === 0 || d.getDay() === 6;
      const data = filteredData(d);

      let stateCls = '';
      if (isWE) stateCls += ' weekend';
      if (isToday) stateCls += ' today';
      if (data.demand > CAPACITY) stateCls += ' over';
      else if (data.demand >= 35) stateCls += ' warn';

      const demandPct = Math.min((data.demand / CAPACITY) * 100, 100);
      const taPct     = Math.min((data.events.length * 8 / CAPACITY) * 100, 100);
      const loadCls   = data.demand > CAPACITY ? 'over' : (data.demand >= 35 ? 'warn' : '');

      const chips = data.events.slice(0, 2).map(e => `<div class="wd-prog-chip ${e.k}" title="${e.t}">${e.t}</div>`).join('');
      const more  = data.events.length > 2 ? `<div class="wd-prog-more">+${data.events.length - 2}</div>` : '';

      cellsHTML += `
        <div class="wd-cell${stateCls}" data-date="${key(d)}">
          <div class="wd-head">
            <span class="wd-dow">${DOW[d.getDay()]}</span>
            <span class="wd-num">${d.getDate()}</span>
          </div>
          <div class="wd-bar-stack">
            <div class="wd-bar demand"><i style="width:${demandPct}%"></i></div>
            <div class="wd-bar ta"><i style="width:${taPct}%"></i></div>
          </div>
          <div class="wd-stats">
            <span><span class="wd-stat-num ${loadCls}">${data.demand}</span> <span class="wd-stat-lab">DEM</span></span>
            <span><span class="wd-stat-num">${data.events.length}</span> <span class="wd-stat-lab">PROG</span></span>
          </div>
          <div class="wd-progs">${chips}${more}</div>
        </div>`;

      data.events.forEach(e => {
        if (!seenProgs.has(e.t)) seenProgs.set(e.t, { name: e.t, k: e.k, c: e.c, days: 0 });
        seenProgs.get(e.t).days++;
      });
    }
    weekGrid.innerHTML = cellsHTML;

    // Programme summary
    if (weekProgs) {
      const items = Array.from(seenProgs.values()).sort((a,b) => b.days - a.days);
      if (!items.length) {
        weekProgs.innerHTML = `<div style="padding:14px;color:var(--text-muted);font:600 12px var(--font);text-align:center">No programmes match the current track + client filter.</div>`;
      } else {
        weekProgs.innerHTML = items.map(p => `
          <div class="wp-card ${p.k}">
            <div class="wp-bar"></div>
            <div class="wp-body">
              <div class="wp-name">${p.name}</div>
              <div class="wp-code">Track ${p.k.toUpperCase()} · Client ${(p.c||'').toUpperCase()}</div>
              <div class="wp-meta">
                <span><b>${p.days}</b> days this week</span>
              </div>
            </div>
          </div>`).join('');
      }
    }
  }

  // -- Toolbar / view switching --
  function updateLabel() {
    if (view === 'year') {
      monthLbl.textContent = cursor.getFullYear();
    } else if (view === 'quarter') {
      const q = Math.floor(cursor.getMonth() / 3) + 1;
      monthLbl.textContent = `Q${q} ${cursor.getFullYear()}`;
    } else if (view === 'gantt') {
      const endD = new Date(today); endD.setDate(today.getDate() + 27);
      monthLbl.textContent = `${today.getDate()} ${MONTHS_SHORT[today.getMonth()]} – ${endD.getDate()} ${MONTHS_SHORT[endD.getMonth()]} ${endD.getFullYear()}`;
    } else {
      monthLbl.textContent = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    }
  }

  function render() {
    updateLabel();
    if (view === 'year')         wrap.innerHTML = renderYear(cursor);
    else if (view === 'quarter') wrap.innerHTML = renderQuarter(cursor);
    else if (view === 'gantt')   wrap.innerHTML = renderGantt();
    else                         wrap.innerHTML = renderMonth(cursor);
  }

  // -- Navigation --
  prevBtn?.addEventListener('click', () => {
    if (view === 'year') cursor.setFullYear(cursor.getFullYear() - 1);
    else if (view === 'quarter') cursor.setMonth(cursor.getMonth() - 3);
    else if (view === 'gantt') { /* fixed 28 days from today */ }
    else cursor.setMonth(cursor.getMonth() - 1);
    render();
  });
  nextBtn?.addEventListener('click', () => {
    if (view === 'year') cursor.setFullYear(cursor.getFullYear() + 1);
    else if (view === 'quarter') cursor.setMonth(cursor.getMonth() + 3);
    else if (view === 'gantt') { /* fixed 28 days from today */ }
    else cursor.setMonth(cursor.getMonth() + 1);
    render();
  });
  todayBtn?.addEventListener('click', () => {
    cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    selectedDate = new Date(today);
    render();
    renderWeek();
  });

  // -- View toggle (Month/Quarter/Year/Gantt) · scoped to calendar panel --
  const calToggleScope = document.querySelector('[data-panel="calendar"] .cal-view-toggle');
  calToggleScope?.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      calToggleScope.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      view = b.dataset.view;
      render();
    });
  });

  // -- Filter chips (Track + Client) --
  document.querySelectorAll('.cf-chips').forEach(group => {
    group.addEventListener('click', (e) => {
      const chip = e.target.closest('.cf-chip');
      if (!chip) return;
      group.querySelectorAll('.cf-chip').forEach(x => x.classList.remove('active'));
      chip.classList.add('active');
      const type = group.dataset.filterType;
      const val  = chip.dataset.val;
      if (type === 'track')  trackFilter  = val;
      if (type === 'client') clientFilter = val;
      render();
      renderWeek();
    });
  });

  // -- Day click → set selectedDate, refocus week below --
  wrap.addEventListener('click', (e) => {
    const day = e.target.closest('[data-date]');
    if (!day) return;
    const d = day.dataset.date;
    const [y, m, dd] = d.split('-').map(Number);
    selectedDate = new Date(y, m - 1, dd);
    renderWeek();
    // Smooth-scroll to the week panel
    weekGrid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // -- Week prev/next --
  weekPrev?.addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() - 7);
    renderWeek();
  });
  weekNext?.addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() + 7);
    renderWeek();
  });

  // -- Initial render --
  render();
  renderWeek();
})();

/* ============================================================
   Requirements Gantt chart
   ============================================================ */
(function buildGantt() {
  const chart = document.getElementById('ganttChart');
  if (!chart) return;

  // Axis spans 1 May 2026 → 31 Oct 2026 (184 days)
  const minDate = new Date(2026, 4, 1);   // 1 May
  const maxDate = new Date(2026, 9, 31);  // 31 Oct
  const today   = new Date(2026, 4, 22);  // 22 May
  const totalDays = Math.round((maxDate - minDate) / 864e5);

  // 18 requirements with parsed dates
  const rows = [
    { risk:'high', name:'BCA/MCA · TT Integrated',     code:'Parul-135',          start:new Date(2026,5,1),  end:new Date(2026,8,25), filled:6,  total:10 },
    { risk:'high', name:'NerdX Tech Track',            code:'SKI-100',            start:new Date(2026,4,21), end:new Date(2026,5,26), filled:4,  total:21 },
    { risk:'high', name:'NerdX Aptitude Track',        code:'SKI-099',            start:new Date(2026,4,21), end:new Date(2026,4,31), filled:7,  total:21 },
    { risk:'high', name:'Summer Residential Ph 1',     code:'REC-001',            start:new Date(2026,5,17), end:new Date(2026,5,26), filled:5,  total:5  },
    { risk:'high', name:'Cloud Azure · .Net',          code:'LTIM-Mumbai-027',    start:new Date(2026,5,11), end:new Date(2026,7,1),  filled:1,  total:1  },
    { risk:'med',  name:'JAVA Full Stack',             code:'LTIM-Bhub-038',      start:new Date(2026,5,11), end:new Date(2026,7,6),  filled:2,  total:2  },
    { risk:'med',  name:'BCA · Nerdx Cohort 2',        code:'Parul-134',          start:new Date(2026,4,21), end:new Date(2026,5,23), filled:12, total:12 },
    { risk:'med',  name:'SDET Java · Batch 2',         code:'LTIM-Bhub-024',      start:new Date(2026,5,8),  end:new Date(2026,5,19), filled:3,  total:4  },
    { risk:'med',  name:'SKG Electives · ML S5',       code:'SKG-ML-S5',          start:new Date(2026,5,10), end:new Date(2026,5,28), filled:3,  total:3  },
    { risk:'med',  name:'SKG · CySec Sem 6',           code:'SKG-CS-S6',          start:new Date(2026,5,15), end:new Date(2026,5,26), filled:2,  total:2  },
    { risk:'med',  name:'LTM Internship · CySec',      code:'LTM-001',            start:new Date(2026,5,22), end:new Date(2026,6,4),  filled:1,  total:3  },
    { risk:'med',  name:'Hexaware Python · B3',        code:'HEX-B3',             start:new Date(2026,5,2),  end:new Date(2026,5,13), filled:2,  total:2  },
    { risk:'low',  name:'VIT-WILP M.Tech CSE AI/ML',   code:'iamneo-014',         start:new Date(2026,4,16), end:new Date(2026,4,29), filled:40, total:40 },
    { risk:'low',  name:'Hexaware Python · B4',        code:'HEX-B4',             start:new Date(2026,5,16), end:new Date(2026,5,27), filled:2,  total:2  },
    { risk:'low',  name:'KCT NerdX 2027 MS · B1',      code:'KCT-MS-B1',          start:new Date(2026,6,4),  end:new Date(2026,6,18), filled:4,  total:4  },
    { risk:'low',  name:'KCT NerdX 2027 MS · B2',      code:'KCT-MS-B2',          start:new Date(2026,6,4),  end:new Date(2026,6,18), filled:4,  total:4  },
    { risk:'low',  name:'Parul · MBA SAP HR',          code:'Parul-MBA-HR',       start:new Date(2026,6,1),  end:new Date(2026,8,30), filled:2,  total:2  },
    { risk:'low',  name:'Parul · MBA SAP Finance',     code:'Parul-MBA-FIN',      start:new Date(2026,6,1),  end:new Date(2026,8,30), filled:2,  total:2  }
  ];

  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Build month headers: 6 months × varying widths
  // Each month gets a column proportional to its day count
  const monthBlocks = [];
  let cursor = new Date(minDate);
  while (cursor <= maxDate) {
    const m = cursor.getMonth();
    const y = cursor.getFullYear();
    const monthEnd = new Date(y, m + 1, 0); // last day of month
    const clippedEnd = monthEnd > maxDate ? maxDate : monthEnd;
    const startDay = Math.round((cursor - minDate) / 864e5);
    const endDay   = Math.round((clippedEnd - minDate) / 864e5);
    monthBlocks.push({
      label: `${MONTH_SHORT[m]} ${y}`,
      pct: ((endDay - startDay + 1) / (totalDays + 1)) * 100
    });
    cursor = new Date(y, m + 1, 1);
  }

  // Build header
  const headerHTML = `
    <div class="gantt-head-left">Requirement</div>
    <div class="gantt-head-right" style="grid-template-columns: ${monthBlocks.map(b => `${b.pct}fr`).join(' ')}">
      ${monthBlocks.map(b => `<div class="gantt-month-head">${b.label}</div>`).join('')}
    </div>
  `;

  // Build rows
  const rowsHTML = rows.map(r => {
    const startDay = Math.max(0, Math.round((r.start - minDate) / 864e5));
    const endDay   = Math.min(totalDays, Math.round((r.end - minDate) / 864e5));
    const leftPct  = (startDay / (totalDays + 1)) * 100;
    const widthPct = ((endDay - startDay + 1) / (totalDays + 1)) * 100;
    const fillPct  = (r.filled / r.total) * 100;
    const allocLabel = `${r.filled}/${r.total}`;
    return `
      <div class="gantt-row-label">
        <div class="name">${r.name}</div>
        <div class="code">${r.code}</div>
      </div>
      <div class="gantt-row-track" data-code="${r.code}">
        <div class="gantt-bar risk-${r.risk}" style="left:${leftPct.toFixed(2)}%; width:${widthPct.toFixed(2)}%" data-code="${r.code}" data-name="${r.name}">
          <div class="gantt-bar-fill" style="width:${fillPct.toFixed(1)}%"></div>
          <span class="lbl">${r.name}</span>
          <span class="frac">${allocLabel}</span>
        </div>
      </div>
    `;
  }).join('');

  chart.innerHTML = headerHTML + rowsHTML;

  // Today line on every row track
  const todayPct = ((today - minDate) / 864e5 / (totalDays + 1)) * 100;
  chart.querySelectorAll('.gantt-row-track').forEach((track, idx) => {
    const line = document.createElement('div');
    line.className = 'gantt-today-line';
    line.style.left = `calc(${todayPct.toFixed(2)}% - 1px)`;
    if (idx !== 0) line.style.setProperty('--hide-tag', '1');
    track.appendChild(line);
  });
  // Only show TODAY tag on the first row
  const firstLine = chart.querySelector('.gantt-row-track:not(:first-of-type) .gantt-today-line');
  chart.querySelectorAll('.gantt-row-track').forEach((track, idx) => {
    if (idx > 0) {
      const l = track.querySelector('.gantt-today-line');
      if (l) l.style.cssText += ';--no-tag:1';
    }
  });
  // Inject style to suppress TODAY badge on non-first rows
  if (!document.getElementById('ganttTodayStyle')) {
    const st = document.createElement('style');
    st.id = 'ganttTodayStyle';
    st.textContent = `.gantt-row-track:not(:first-of-type) .gantt-today-line::before { display: none; }`;
    document.head.appendChild(st);
  }

  // Bar click → open requirement detail modal
  chart.addEventListener('click', (e) => {
    const bar = e.target.closest('.gantt-bar');
    if (!bar) return;
    const code = bar.dataset.code;
    const name = bar.dataset.name;
    const row = rows.find(r => r.code === code);
    if (!row) return;
    const startStr = row.start.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
    const endStr   = row.end.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
    const days     = Math.round((row.end - row.start) / 864e5) + 1;
    openModal({
      title: name,
      subtitle: `${code} · ${days} days`,
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
      body: `
        <div class="modal-section">
          <div class="h">Timeline</div>
          <div class="modal-row"><div class="k">Start</div><div class="v">${startStr}</div></div>
          <div class="modal-row"><div class="k">End</div><div class="v">${endStr}</div></div>
          <div class="modal-row"><div class="k">Duration</div><div class="v">${days} days</div></div>
        </div>
        <div class="modal-section">
          <div class="h">Allocation</div>
          <div class="modal-row"><div class="k">Filled</div><div class="v">${row.filled} / ${row.total} trainers</div></div>
          <div class="modal-row"><div class="k">Risk Level</div><div class="v" style="color:var(--neon-${row.risk === 'high' ? 'red' : row.risk === 'med' ? 'yellow' : 'green'});text-transform:uppercase;letter-spacing:0.08em">${row.risk}</div></div>
        </div>
      `,
      footer: `
        <button class="btn-ghost" onclick="closeModal()">Close</button>
        <button class="btn-primary" onclick="closeModal(); showToast('Opening ${code}', 'Switching to allocation view…', 'info');">Manage Allocation</button>
      `
    });
  });

  // View toggle (Table ↔ Gantt)
  const tableWrap = document.getElementById('reqTableWrap');
  const ganttWrap = document.getElementById('reqGanttWrap');
  document.querySelectorAll('#reqViewToggle button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#reqViewToggle button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const view = b.dataset.rview;
      if (tableWrap) tableWrap.style.display = (view === 'table') ? '' : 'none';
      if (ganttWrap) ganttWrap.style.display = (view === 'gantt') ? '' : 'none';
    });
  });
})();

/* ============================================================
   Active Pipeline (paginated flex-card list)
   ============================================================ */
(function buildPipeline() {
  const list   = document.getElementById('pipelineList');
  const toggle = document.getElementById('pipeToggle');
  const shown  = document.getElementById('pipeShown');
  if (!list) return;

  const data = [
    { risk:'high', name:'BCA/MCA · TT Integrated', code:'Parul-135 · Parul University',           doms:['DSA','OS','Aptitude'],  window:'1 Jun → 25 Sep', days:130, demand:10, filled:6,  total:10, alloc:60,  status:'open',    label:'OPEN' },
    { risk:'high', name:'NerdX Tech Track',         code:'SKI-100 · SKG',                          doms:['DSA'],                  window:'21 May → 26 Jun', days:20,  demand:21, filled:4,  total:21, alloc:19,  status:'gap',     label:'GAP'  },
    { risk:'high', name:'NerdX Aptitude Track',     code:'SKI-099 · SKG',                          doms:['Aptitude'],             window:'21 May → 31 May', days:10,  demand:21, filled:7,  total:21, alloc:33,  status:'gap',     label:'GAP'  },
    { risk:'high', name:'Summer Residential · Ph 1',code:'REC-001 · Rajalakshmi',                  doms:['C++','JAVA','Python'],  window:'17 Jun → 26 Jun', days:10,  demand:5,  filled:5,  total:5,  alloc:100, status:'open',    label:'OPEN' },
    { risk:'high', name:'Cloud Azure · .Net',       code:'LTIM-Mumbai-027 · LTI',                  doms:['.NET','Cloud'],         window:'11 Jun → 1 Aug',  days:40,  demand:1,  filled:1,  total:1,  alloc:100, status:'closed',  label:'CLOSED' },

    { risk:'med',  name:'JAVA Full Stack',          code:'LTIM-Bhubaneswar-038 · LTI',             doms:['Java FS'],              window:'11 Jun → 6 Aug',  days:51,  demand:2,  filled:2,  total:2,  alloc:100, status:'closed',  label:'CLOSED' },
    { risk:'med',  name:'BCA · Nerdx (Cohort 2)',   code:'Parul-134 · Parul University',           doms:['DSA'],                  window:'21 May → 23 Jun', days:30,  demand:12, filled:12, total:12, alloc:100, status:'closed',  label:'CLOSED' },
    { risk:'med',  name:'SDET Java · Batch 2',      code:'LTIM-Bhubaneswar-024 · LTI',             doms:['SDET','Java'],          window:'8 Jun → 19 Jun',  days:12,  demand:4,  filled:3,  total:4,  alloc:75,  status:'open',    label:'OPEN' },
    { risk:'med',  name:'SKG Electives · ML S5',    code:'SKG-ML-S5 · SKG',                        doms:['Python','ML'],          window:'10 Jun → 28 Jun', days:18,  demand:3,  filled:3,  total:3,  alloc:100, status:'closed',  label:'CLOSED' },
    { risk:'med',  name:'SKG · CySec Sem 6',        code:'SKG-CS-S6 · SKG · KCT',                  doms:['Cyber','Forensics'],    window:'15 Jun → 26 Jun', days:12,  demand:2,  filled:2,  total:2,  alloc:100, status:'closed',  label:'CLOSED' },
    { risk:'med',  name:'LTM Internship · CySec',   code:'LTM-001 · LTI · Mumbai',                 doms:['Cyber'],                window:'22 Jun → 4 Jul',  days:13,  demand:3,  filled:1,  total:3,  alloc:33,  status:'gap',     label:'GAP'  },
    { risk:'med',  name:'Hexaware Python · B3',     code:'HEX-B3 · Hexaware',                      doms:['Python'],               window:'2 Jun → 13 Jun',  days:12,  demand:2,  filled:2,  total:2,  alloc:100, status:'closed',  label:'CLOSED' },

    { risk:'low',  name:'VIT-WILP M.Tech CSE',      code:'iamneo-014 · iamneo',                    doms:['Exam Reporting'],       window:'16 May → 29 May', days:14,  demand:40, filled:40, total:40, alloc:100, status:'closed',  label:'ONGOING' },
    { risk:'low',  name:'Hexaware Python · B4',     code:'HEX-B4 · Hexaware',                      doms:['Python'],               window:'16 Jun → 27 Jun', days:12,  demand:2,  filled:2,  total:2,  alloc:100, status:'closed',  label:'CLOSED' },
    { risk:'low',  name:'KCT NerdX 2027 MS · B1',   code:'KCT-MS-B1 · KCT',                        doms:['DSA','SDET'],           window:'4 Jul → 18 Jul',  days:15,  demand:4,  filled:4,  total:4,  alloc:100, status:'closed',  label:'CLOSED' },
    { risk:'low',  name:'KCT NerdX 2027 MS · B2',   code:'KCT-MS-B2 · KCT',                        doms:['DSA','SDET'],           window:'4 Jul → 18 Jul',  days:15,  demand:4,  filled:4,  total:4,  alloc:100, status:'closed',  label:'CLOSED' },
    { risk:'low',  name:'Parul · MBA SAP HR',       code:'Parul-MBA-HR-S1 · Parul',                doms:['SAP','C_THR81'],        window:'1 Jul → 30 Sep',  days:91,  demand:2,  filled:2,  total:2,  alloc:100, status:'closed',  label:'CLOSED' },
    { risk:'low',  name:'Parul · MBA SAP Finance',  code:'Parul-MBA-FIN-S1 · Parul',               doms:['SAP','C_TS4FI'],        window:'1 Jul → 30 Sep',  days:91,  demand:2,  filled:2,  total:2,  alloc:100, status:'closed',  label:'CLOSED' }
  ];

  const ICON_MORE = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>';

  function statusChip(s, label) {
    const map = { open:'warning', closed:'success', gap:'error', ongoing:'cyan' };
    const cls = map[s] || 'neutral';
    return `<span class="chip ${cls}"><span class="chip-dot"></span>${label}</span>`;
  }

  function render(limit) {
    const slice = data.slice(0, limit);
    list.innerHTML = slice.map(r => {
      const allocClass = r.alloc >= 100 ? '' : (r.alloc >= 60 ? 'warn' : 'crit');
      return `
        <div class="pipe-row r-${r.risk}" data-code="${r.code.split(' · ')[0]}">
          <div class="pipe-title">
            <div class="name">${r.name}</div>
            <div class="code">${r.code}</div>
            <div class="doms">${r.doms.map(d => `<span>${d}</span>`).join('')}</div>
          </div>
          <div class="pipe-window">
            ${r.window}
            <span class="days">${r.days} days</span>
          </div>
          <div class="pipe-demand">
            ${r.demand}
            <span class="lab">trainers</span>
          </div>
          <div class="pipe-alloc">
            <div class="bar ${allocClass}"><i style="width:${Math.min(r.alloc,100)}%"></i></div>
            <div class="nm">${r.filled}/${r.total}</div>
          </div>
          <div class="pipe-status">${statusChip(r.status, r.label)}</div>
          <button class="pipe-more" data-action="row-menu" data-code="${r.code.split(' · ')[0]}" aria-label="More actions">${ICON_MORE}</button>
        </div>
      `;
    }).join('');
    if (shown) shown.textContent = slice.length;
  }

  let expanded = false;
  render(5);

  toggle?.addEventListener('click', () => {
    expanded = !expanded;
    if (expanded) {
      render(data.length);
      toggle.classList.add('expanded');
      toggle.firstChild.nodeValue = '\n              Collapse\n              ';
    } else {
      render(5);
      toggle.classList.remove('expanded');
      toggle.firstChild.nodeValue = '\n              Show All\n              ';
    }
  });
})();
(function buildTrackList() {
  const track = document.getElementById('trackList');
  if (!track) return;
  const rows = [
    {date:'Mon 1 Jun', sub:'Week 23', i:12, f:8, t:4, tot:24, label:'Parul-135 starts'},
    {date:'Tue 2 Jun', sub:'Week 23', i:14, f:11, t:5, tot:30, label:'+ LTIM-027 onboarding'},
    {date:'Wed 3 Jun', sub:'Week 23', i:18, f:13, t:6, tot:37, label:'SKI-100 batches begin'},
    {date:'Thu 4 Jun', sub:'Week 23', i:16, f:14, t:6, tot:36, label:'Peak overlap window'},
    {date:'Fri 5 Jun', sub:'Week 23', i:17, f:15, t:6, tot:38, label:'OVER capacity — alert'},
    {date:'Mon 8 Jun', sub:'Week 24', i:18, f:13, t:5, tot:36, label:'Parul-134 closeout'},
    {date:'Tue 9 Jun', sub:'Week 24', i:20, f:14, t:5, tot:39, label:'KCT-009 + REC-001 prep'},
    {date:'Wed 10 Jun', sub:'Week 24', i:22, f:12, t:6, tot:40, label:'Cloud Azure onboarding'}
  ];
  const maxV = 42;
  track.innerHTML = rows.map(r => {
    const ratio = r.tot / maxV;
    const barClass = ratio >= 1 ? 'crit' : (ratio >= 0.85 ? 'warn' : '');
    const totColor = ratio >= 1 ? 'var(--neon-red)' : (ratio >= 0.85 ? 'var(--neon-yellow)' : 'var(--text-primary)');
    return `
      <div class="track-row">
        <div class="track-day">
          ${r.date}
          <span class="sub">${r.sub} · ${r.label}</span>
        </div>
        <div class="track-bars">
          <div class="seg" style="width:${(r.i/maxV)*100}%">Int ${r.i}</div>
          <div class="seg ext" style="width:${(r.f/maxV)*100}%">Frl ${r.f}</div>
          <div class="seg ta" style="width:${(r.t/maxV)*100}%">TA ${r.t}</div>
        </div>
        <div class="track-tot" style="color:${totColor}">
          ${r.tot}
          <span class="lab">/ 42 cap</span>
        </div>
      </div>
    `;
  }).join('');
})();

/* ============================================================
   Heatmap (Trainer × Day)
   ============================================================ */
(function buildHeatmap() {
  const hm = document.getElementById('heatmap');
  if (!hm) return;

  const trainers = [
    {name:'Abinaya P', id:'neo10400'},
    {name:'Anthony Sahaya Michael M', id:'neo10166'},
    {name:'Aravindhan S', id:'neo10172'},
    {name:'Azhagu Venkadesh S V', id:'neo10153'},
    {name:'Karunya Mohan', id:'neo10396'},
    {name:'Manopalaniraja A', id:'neo10282'},
    {name:'Manoj Kumar', id:'neo10402'},
    {name:'Sahil Deswal', id:'neo10408'},
    {name:'Sai Raghavendra B', id:'neo10394'},
    {name:'Siva Prasanna S', id:'neo10221'},
    {name:'Surya K', id:'neo10376'},
    {name:'Vasudevan Badri', id:'neo10371'},
    {name:'Yogeshwaran K', id:'neo10417'},
    {name:'Anshul Mishra', id:'neo10498'},
    {name:'Karan Dharmalingam', id:'neo10265'}
  ];
  const days = 28;
  const dayNames = ['S','M','T','W','T','F','S'];
  // Generate col headers row
  let html = '<div></div>';
  const start = new Date(2026, 4, 22);
  for (let i=0; i<days; i++) {
    const d = new Date(start.getTime() + i*864e5);
    const dn = d.getDay();
    const we = (dn === 0 || dn === 6) ? ' weekend' : '';
    html += `<div class="hm-col-head${we}">${dayNames[dn]}<span class="d">${d.getDate()}</span></div>`;
  }

  // Rows
  trainers.forEach((t, ti) => {
    html += `<div class="hm-row-label">${t.name}</div>`;
    for (let i=0; i<days; i++) {
      const d = new Date(start.getTime() + i*864e5);
      const dn = d.getDay();
      const we = (dn === 0 || dn === 6);

      // Pseudo-random pattern based on trainer index + day
      let cls = '';
      const seed = (ti * 7 + i * 3) % 11;
      if (we) cls = 'weekend';
      else if (ti === 10 && i >= 10 && i <= 18) cls = (i === 13 || i === 14) ? 'r1' : 'b3'; // Surya K busy
      else if (ti === 13 && i >= 0 && i <= 8) cls = 'b2';                                    // Anshul
      else if (ti === 7 && i >= 12 && i <= 22) cls = 'f3';                                  // Sahil
      else if (ti === 9 && i >= 5 && i <= 20) cls = 'b2';                                   // Siva
      else if (ti === 4 && i >= 8) cls = 'f2';
      else if (ti === 1 && (i >= 10 && i <= 17)) cls = 'b3';
      else if (seed === 0) cls = 'f1';
      else if (seed === 3) cls = 'f2';
      else if (seed === 5) cls = 'b1';
      else if (seed === 7) cls = 'y1';
      else cls = '';

      const tipText = we ? 'Weekend · Off' : (cls.startsWith('b') ? 'Allocated' : (cls.startsWith('f') ? 'Light load' : (cls === 'y1' ? 'Overlap risk' : (cls === 'r1' ? 'Hard conflict' : 'Free'))));
      html += `<div class="hm-cell ${cls}" data-tip="${t.name} · Day ${d.getDate()} · ${tipText}"></div>`;
    }
  });

  hm.innerHTML = html;
})();

/* ============================================================
   Matrix filter chips (track + client) — visual + toast feedback
   ============================================================ */
(function wireMatrixFilters() {
  const root = document.getElementById('matrixFilters');
  if (!root) return;
  root.querySelectorAll('.cf-chips').forEach(group => {
    group.addEventListener('click', (e) => {
      const chip = e.target.closest('.cf-chip');
      if (!chip) return;
      group.querySelectorAll('.cf-chip').forEach(x => x.classList.remove('active'));
      chip.classList.add('active');
      const type = group.dataset.filterType === 'm-track' ? 'Track' : 'Client';
      const val  = chip.textContent.trim();
      showToast(`${type} filter applied`, `Matrix now scoped to: ${val}`, 'info');
    });
  });
})();

/* ============================================================
   Trainer directory cards
   ============================================================ */
(function buildTrainerDir() {
  const grid = document.getElementById('trainerDir');
  if (!grid) return;
  const dirs = [
    {n:'Siva Prasanna S', id:'neo10221', t:'Internal · Java FS', avail:21, occ:0, conf:0, pct:0, st:'available'},
    {n:'Anthony Sahaya M', id:'neo10166', t:'Internal SME · Angular', avail:6, occ:14, conf:0, pct:67, st:'occupied'},
    {n:'Surya K', id:'neo10376', t:'Internal · DSA/SDET', avail:3, occ:16, conf:2, pct:85, st:'conflict'},
    {n:'Anshul Mishra', id:'neo10498', t:'Internal · DSA', avail:8, occ:13, conf:0, pct:62, st:'occupied'},
    {n:'Sahil Deswal', id:'neo10408', t:'Internal · ML/Python', avail:5, occ:16, conf:0, pct:76, st:'occupied'},
    {n:'Yogeshwaran K', id:'neo10417', t:'Internal · Cyber Sec', avail:7, occ:14, conf:0, pct:67, st:'occupied'},
    {n:'Sai Raghavendra B', id:'neo10394', t:'Internal · .NET', avail:6, occ:15, conf:0, pct:71, st:'occupied'},
    {n:'Vasudevan Badri', id:'neo10371', t:'Internal · SDET-Java', avail:18, occ:3, conf:0, pct:14, st:'available'},
    {n:'Karunya Mohan', id:'neo10396', t:'Internal · Python', avail:12, occ:9, conf:0, pct:43, st:'available'},
    {n:'Manoj Kumar', id:'neo10402', t:'Internal · Java FS', avail:9, occ:12, conf:0, pct:57, st:'occupied'},
    {n:'Abinaya P', id:'neo10400', t:'Internal · C / DSA', avail:19, occ:2, conf:0, pct:9, st:'available'},
    {n:'Bindhiya J', id:'neo10457', t:'Internal · DSA · CMREC', avail:14, occ:7, conf:0, pct:33, st:'available'}
  ];
  grid.innerHTML = dirs.map(d => {
    const barClass = d.pct >= 85 ? 'crit' : (d.pct >= 60 ? 'warn' : '');
    const st = d.st === 'conflict'
      ? '<span class="chip error"><span class="chip-dot"></span>Conflict</span>'
      : d.st === 'occupied'
        ? '<span class="chip accent"><span class="chip-dot"></span>Occupied</span>'
        : '<span class="chip success"><span class="chip-dot"></span>Available</span>';
    return `
      <div class="dir-card">
        <div class="top">
          <div>
            <div class="name">${d.n}</div>
            <div class="id">${d.id} · ${d.t}</div>
          </div>
          ${st}
        </div>
        <div class="bar ${barClass}"><div style="width:${d.pct}%"></div></div>
        <div class="stats">
          <span><span class="v g">${d.avail}</span><span class="l">Avail Days</span></span>
          <span><span class="v b">${d.occ}</span><span class="l">Allocated</span></span>
          <span><span class="v r">${d.conf}</span><span class="l">Conflict</span></span>
          <span><span class="v">${d.pct}%</span><span class="l">Load</span></span>
        </div>
      </div>
    `;
  }).join('');
})();

/* ============================================================
   Toast notifications
   ============================================================ */
const _toastStack = document.getElementById('toastStack');
const _toastIcons = {
  ok:   '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  err:  '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
};
function showToast(title, msg, type = 'info') {
  if (!_toastStack) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <div class="icon">${_toastIcons[type] || _toastIcons.info}</div>
    <div class="ttl">${title}</div>
    ${msg ? `<div class="msg">${msg}</div>` : ''}
  `;
  _toastStack.appendChild(el);
  setTimeout(() => el.remove(), 4600);
}
window.showToast = showToast;
window.qlabs.showToast = showToast;

/* ============================================================
   Modal dialog
   ============================================================ */
const _modalBackdrop = document.getElementById('modalBackdrop');
const _modalTitle    = document.getElementById('modalTitle');
const _modalSubtitle = document.getElementById('modalSubtitle');
const _modalBody     = document.getElementById('modalBody');
const _modalFoot     = document.getElementById('modalFoot');
const _modalIcon     = document.getElementById('modalIcon');

function openModal({ title, subtitle, body, footer, icon }) {
  _modalTitle.textContent    = title    || 'Action';
  _modalSubtitle.textContent = subtitle || '';
  _modalBody.innerHTML       = body     || '';
  _modalFoot.innerHTML       = footer   || '';
  if (icon) _modalIcon.innerHTML = icon;
  _modalBackdrop.classList.add('open');
}
function closeModal() { _modalBackdrop.classList.remove('open'); }
window.openModal = openModal;
window.closeModal = closeModal;
window.qlabs.openModal = openModal;
window.qlabs.closeModal = closeModal;

document.getElementById('modalClose')?.addEventListener('click', closeModal);
_modalBackdrop?.addEventListener('click', closeModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && _modalBackdrop.classList.contains('open')) closeModal();
});

/* ============================================================
   Row-action popover
   ============================================================ */
const _rowPop = document.getElementById('rowPopover');
let   _popTarget = null;

function openPopover(anchor) {
  if (!_rowPop) return;
  _popTarget = anchor;
  const r = anchor.getBoundingClientRect();
  _rowPop.style.top  = (window.scrollY + r.bottom + 6) + 'px';
  _rowPop.style.left = Math.max(8, window.scrollX + r.right - 200) + 'px';
  _rowPop.classList.add('open');
}
function closePopover() { _rowPop?.classList.remove('open'); _popTarget = null; }
document.addEventListener('click', (e) => {
  if (!_rowPop) return;
  if (_rowPop.contains(e.target)) return;
  if (e.target.closest('[data-action="row-menu"]')) return;
  closePopover();
});

/* ============================================================
   Global action wiring (delegation)
   ============================================================ */
document.addEventListener('click', (e) => {

  // Pipeline row · more menu
  const moreBtn = e.target.closest('[data-action="row-menu"]');
  if (moreBtn) {
    e.stopPropagation();
    const code = moreBtn.dataset.code || '';
    _rowPop.dataset.contextCode = code;
    openPopover(moreBtn);
    return;
  }

  // Popover items
  const popItem = e.target.closest('.popover-item');
  if (popItem && _rowPop.classList.contains('open')) {
    const action = popItem.dataset.pop;
    const code   = _rowPop.dataset.contextCode || '';
    closePopover();
    const actionTitles = {
      view:      ['Opening Details',     `Loading ${code} from Excel sync…`, 'info'],
      edit:      ['Edit Mode',           `${code} is now editable — changes auto-save`, 'ok'],
      allocate:  ['Allocate Trainer',    `Opening trainer picker for ${code}`, 'info'],
      duplicate: ['Requirement Duplicated', `${code} cloned · new ID auto-assigned`, 'ok'],
      archive:   ['Moved to Archive',    `${code} archived · undo available for 30s`, 'warn']
    };
    const [t, m, ty] = actionTitles[action] || ['Action', '', 'info'];
    showToast(t, m, ty);
    return;
  }

  // Conflict resolution buttons (cc-btn)
  const ccBtn = e.target.closest('.cc-btn');
  if (ccBtn) {
    const card  = ccBtn.closest('.conflict-card');
    const name  = card?.querySelector('.cc-name')?.textContent || 'Trainer';
    const label = ccBtn.textContent.trim();
    if (label === 'Accept') {
      showToast('Resolution Accepted', `${name} reassigned per suggestion. ClickUp + Outlook synced.`, 'ok');
      if (card) card.style.opacity = '0.45';
    } else if (label === 'Manual') {
      openModal({
        title: `Manual Resolution · ${name}`,
        subtitle: 'Override the AI suggestion',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>',
        body: `
          <div class="modal-section">
            <div class="h">Pick Replacement Trainer</div>
            <select style="width:100%;padding:10px 12px;background:var(--bg-surface-hi);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;font:600 12px var(--font)">
              <option>Vasudevan Badri · neo10371 · 14% load</option>
              <option>Karunya Mohan · neo10396 · 43% load</option>
              <option>Abinaya P · neo10400 · 9% load</option>
              <option>Bindhiya J · neo10457 · 33% load</option>
              <option>Siva Prasanna S · neo10221 · 12% load</option>
            </select>
          </div>
          <div class="modal-section">
            <div class="h">Effective From</div>
            <input type="date" value="2026-06-02" style="width:100%;padding:10px 12px;background:var(--bg-surface-hi);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;font:600 12px var(--mono)"/>
          </div>
          <div class="modal-section">
            <div class="h">Note (Optional)</div>
            <textarea rows="3" placeholder="Add context for the audit log…" style="width:100%;padding:10px 12px;background:var(--bg-surface-hi);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;font:500 12px var(--font);resize:vertical"></textarea>
          </div>
        `,
        footer: `
          <button class="btn-ghost" onclick="closeModal()">Cancel</button>
          <button class="btn-primary" onclick="closeModal(); showToast('Manual Replacement Saved', '${name} swap recorded · Slack notified', 'ok');">Save Replacement</button>
        `
      });
    } else if (label === 'Hire') {
      showToast('Hire Request Raised', `Freelancer JD opened in HR for ${name}'s skill (ref HR-2026-04XX)`, 'info');
    } else if (label === 'Escalate') {
      showToast('Escalated to Manager', `Poomanirajan M · Ramesh Berkmans notified via Teams`, 'warn');
    }
    return;
  }

  // Header "New Requirement" buttons
  const newBtn = e.target.closest('.btn-primary');
  if (newBtn && newBtn.textContent.includes('New Requirement')) {
    openModal({
      title: 'New Requirement · Request ID',
      subtitle: 'Manual entry · the tool will pick up the rest',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
      body: `
        <div class="modal-section">
          <div class="h">Delivery / Request ID</div>
          <input type="text" placeholder="e.g. SKI-101 · LTIM-Bhub-025" style="width:100%;padding:10px 12px;background:var(--bg-surface-hi);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;font:700 12px var(--mono);letter-spacing:0.02em"/>
        </div>
        <div class="modal-section">
          <div class="h">Course / Program</div>
          <input type="text" placeholder="Course name · cohort · phase" style="width:100%;padding:10px 12px;background:var(--bg-surface-hi);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;font:600 12px var(--font)"/>
        </div>
        <div class="modal-section" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <div class="h">Start Date</div>
            <input type="date" style="width:100%;padding:10px 12px;background:var(--bg-surface-hi);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;font:600 12px var(--mono)"/>
          </div>
          <div>
            <div class="h">End Date</div>
            <input type="date" style="width:100%;padding:10px 12px;background:var(--bg-surface-hi);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;font:600 12px var(--mono)"/>
          </div>
        </div>
        <div class="modal-section" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div>
            <div class="h">Trainers</div>
            <input type="number" placeholder="0" style="width:100%;padding:10px 12px;background:var(--bg-surface-hi);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;font:700 14px var(--mono);text-align:center"/>
          </div>
          <div>
            <div class="h">TAs</div>
            <input type="number" placeholder="0" style="width:100%;padding:10px 12px;background:var(--bg-surface-hi);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;font:700 14px var(--mono);text-align:center"/>
          </div>
          <div>
            <div class="h">Batches</div>
            <input type="number" placeholder="1" style="width:100%;padding:10px 12px;background:var(--bg-surface-hi);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;font:700 14px var(--mono);text-align:center"/>
          </div>
        </div>
        <div class="modal-section">
          <div class="h">Primary Track / Sub-Track</div>
          <input type="text" placeholder="DSA · Python · SDET-Java …" style="width:100%;padding:10px 12px;background:var(--bg-surface-hi);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;font:600 12px var(--font)"/>
        </div>
      `,
      footer: `
        <button class="btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn-primary" onclick="closeModal(); showToast('Requirement Added', 'New row inserted at top of pipeline · Excel sync queued', 'ok');">Create Requirement</button>
      `
    });
    return;
  }

  // Export button
  const exportBtn = e.target.closest('.btn-ghost');
  if (exportBtn && exportBtn.textContent.trim().toLowerCase().includes('export')) {
    showToast('Snapshot Exported', 'qlabs-capacity-2026-05-22.xlsx ready in Downloads', 'ok');
    return;
  }

  // Pipeline row click → open details modal (not on action button)
  const pipeRow = e.target.closest('.pipe-row');
  if (pipeRow && !e.target.closest('[data-action], .pipe-more')) {
    const name = pipeRow.querySelector('.name')?.textContent || '';
    const code = pipeRow.querySelector('.code')?.textContent || '';
    const win  = pipeRow.querySelector('.pipe-window')?.firstChild?.textContent.trim() || '';
    const dem  = pipeRow.querySelector('.pipe-demand')?.firstChild?.textContent.trim() || '';
    const alc  = pipeRow.querySelector('.pipe-alloc .nm')?.textContent || '';
    openModal({
      title: name || 'Requirement',
      subtitle: code,
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      body: `
        <div class="modal-section">
          <div class="h">Window</div>
          <div class="modal-row"><div class="k">Date Range</div><div class="v">${win}</div></div>
          <div class="modal-row"><div class="k">Demand</div><div class="v">${dem} trainers</div></div>
          <div class="modal-row"><div class="k">Allocation</div><div class="v">${alc}</div></div>
        </div>
        <div class="modal-section">
          <div class="h">Assigned Trainers</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <div style="padding:8px 12px;background:var(--bg-surface-hi);border-radius:6px;font:600 12px var(--font);color:var(--text-primary)">Surya K · <span style="color:var(--text-muted)">neo10376 · Internal</span></div>
            <div style="padding:8px 12px;background:var(--bg-surface-hi);border-radius:6px;font:600 12px var(--font);color:var(--text-primary)">Anshul Mishra · <span style="color:var(--text-muted)">neo10498 · Internal</span></div>
            <div style="padding:8px 12px;background:var(--bg-surface-hi);border-radius:6px;font:600 12px var(--font);color:var(--text-primary)">Abinaya P · <span style="color:var(--text-muted)">neo10400 · Internal</span></div>
          </div>
        </div>
      `,
      footer: `
        <button class="btn-ghost" onclick="closeModal()">Close</button>
        <button class="btn-primary" onclick="closeModal(); showToast('Editing', '${code.split(' · ')[0]} unlocked for changes', 'ok');">Edit</button>
      `
    });
    return;
  }
});
(function tickClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  function pad(n) { return String(n).padStart(2, '0'); }
  function update() {
    const now = new Date();
    const utc = `UTC ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
    const istMs = now.getTime() + (5.5 * 3600 * 1000);
    const ist = new Date(istMs);
    const istStr = `IST ${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}:${pad(ist.getUTCSeconds())}`;
    el.textContent = `${utc} · ${istStr}`;
  }
  update();
  setInterval(update, 1000);
})();

} // end initApp
