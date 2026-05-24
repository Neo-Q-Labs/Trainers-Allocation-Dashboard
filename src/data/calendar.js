export const calendarMetrics = [
  {
    num: "206",
    lab: "Trainer-days needed in the next 30 days",
    sub: "Sum of trainers × days across all active programmes",
    bg: "rgba(239,68,68,0.10)",
    color: "var(--neon-red)",
    iconType: "clock"
  },
  {
    num: "115",
    lab: "TA-days needed alongside trainers",
    sub: "For exam reporting, lab support, mentoring",
    bg: "rgba(168,85,247,0.10)",
    color: "var(--neon-purple)",
    iconType: "trainers"
  },
  {
    num: "11 Jun",
    lab: "Peak demand day",
    sub: "46 trainers needed · 4 over capacity",
    bg: "rgba(245,197,66,0.10)",
    color: "var(--neon-yellow)",
    iconType: "peak"
  },
  {
    num: "17",
    lab: "Free trainers on the worst day",
    sub: "Even at the peak we have a safety margin",
    bg: "rgba(34,211,165,0.10)",
    color: "var(--neon-green)",
    iconType: "free"
  },
  {
    num: "86",
    lab: "Internal trainers in the pool",
    sub: "Full-time + SME · before tapping freelancers",
    bg: "rgba(3,37,189,0.12)",
    color: "var(--accent-text)",
    iconType: "pool"
  },
  {
    num: "42",
    lab: "Daily deployment ceiling",
    sub: "Max trainers we can field in one day",
    bg: "rgba(6,182,212,0.10)",
    color: "var(--cyan)",
    iconType: "ceiling"
  }
];

export const calendarTracks = [
  { val: "all", label: "All", class: "active" },
  { val: "dsa", label: "DSA", class: "dsa" },
  { val: "apt", label: "Aptitude", class: "apt" },
  { val: "fs", label: "Java FS", class: "fs" },
  { val: "cloud", label: ".NET / Cloud", class: "cloud" },
  { val: "cy", label: "Cy.Sec", class: "cy" },
  { val: "sap", label: "SAP", class: "sap" },
  { val: "py", label: "Python / ML", class: "py" }
];

export const calendarClients = [
  { val: "all", label: "All", class: "active" },
  { val: "parul", label: "Parul Univ." },
  { val: "skg", label: "SKG" },
  { val: "lti", label: "LTIMindtree" },
  { val: "kct", label: "KCT" },
  { val: "hex", label: "Hexaware" },
  { val: "iamneo", label: "iamneo Internal" }
];
