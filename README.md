# QLabs · Trainer Allocation Dashboard

Swift Ops · Capacity Planner — a React 19 + Vite + Tailwind 4 application themed with the QLabs "Neon Lab" design system.

## Stack

- **React 19** + **Vite 6**
- **Tailwind 4** (via `@tailwindcss/vite`)
- QLabs Neon Lab design tokens (Nunito + JetBrains Mono · dark-space palette)

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # serve the built bundle
```

## Layout

```
src/
├── main.jsx · App.jsx · index.css
├── _styles.css                 # QLabs Neon Lab styles (3850 lines)
├── components/
│   ├── Sidebar.jsx · Topbar.jsx · PageHead.jsx · StatusBar.jsx
│   ├── CmdK.jsx · Modal.jsx · ToastStack.jsx · Popover.jsx
│   └── Panel.jsx               # mounts panel HTML once, toggles .active via DOM
├── pages/                      # Overview · Requirements · Calendar · Pending ·
│                               #  OASIS · Replace · Matrix · Clients · Conflicts · Workload
├── panels/_*.html              # raw panel markup (presentation data)
├── data/navigation.js          # NAV_ITEMS + PANEL_META
└── lib/setup.js                # chart / calendar / gantt / heatmap runtime
```

## Layering

- **Presentation:** `pages/` + `components/` + `_styles.css`
- **Data:** `data/navigation.js` and `panels/*.html`
- **Behavior:** `lib/setup.js` — single `initApp({ switchPanel })` boots all charts, calendar, gantt, heatmap, modal, toast, popover, status-bar clock

React owns navigation state (active panel, sidebar, page-head). The runtime owns the DOM inside each panel — `Panel.jsx` mounts the HTML once into a ref so React never re-writes it, and the runtime's charts/calendars/heatmaps survive page switches.

Global hooks (`window.openModal`, `window.closeModal`, `window.showToast`, `window.qlabs.*`) are exposed for inline `onclick` handlers in dynamically-rendered markup.
