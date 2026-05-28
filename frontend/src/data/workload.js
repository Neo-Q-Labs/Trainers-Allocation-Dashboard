export const workloadKpis = [
  { label: "Team Avg Load", value: "68", unit: "%", trend: "↑ 4pp vs Apr", iconType: "chart", iconBg: "", iconColor: "" },
  { label: "Over-Loaded (>85%)", value: "11", trend: "7 internal · 4 freelancer", iconType: "warning", iconBg: "rgba(239,68,68,0.12)", iconColor: "var(--neon-red)" },
  { label: "Bench Utilisation", value: "42", unit: "%", trend: "17 trainers idle >7d", iconType: "clock", iconBg: "rgba(34,211,165,0.12)", iconColor: "var(--neon-green)" },
  { label: "Internal : Freelancer", value: "58", extraVal: " : 42", trend: "Target mix 60:40", iconType: "ratio", iconBg: "", iconColor: "" },
  { label: "Forecast Accuracy", value: "81", unit: "%", trend: "Last 4 wks predicted", iconType: "forecast", iconBg: "rgba(245,197,66,0.12)", iconColor: "var(--neon-yellow)" }
];

export const overLoadedLanes = [
  { name: "Surya K", sub: "neo10376 · DSA/SDET", val: "96", barClass: "crit" },
  { name: "Sahil Deswal", sub: "neo10408 · ML", val: "94", barClass: "crit" },
  { name: "Yogeshwaran K", sub: "neo10417 · CySec", val: "91", barClass: "warn" },
  { name: "Sai Raghavendra B", sub: "neo10394 · .NET", val: "88", barClass: "warn" },
  { name: "Anthony Sahaya M", sub: "neo10166 · Angular", val: "86", barClass: "warn" }
];

export const underUtilisedLanes = [
  { name: "Abinaya P", sub: "neo10400 · C/DSA", val: "9", barClass: "low" },
  { name: "Siva Prasanna S", sub: "neo10221 · Java FS", val: "12", barClass: "low" },
  { name: "Vasudevan Badri", sub: "neo10371 · SDET-Java", val: "14", barClass: "low" },
  { name: "Bindhiya J", sub: "neo10457 · DSA", val: "33", barClass: "low" },
  { name: "Karunya Mohan", sub: "neo10396 · Python", val: "43", barClass: "low" }
];

export const skillWeekData = [
  {
    skill: "DSA / Foundation",
    cells: [
      { val: 42, lvl: "l2" },
      { val: 78, lvl: "l4" },
      { val: 96, lvl: "l5" },
      { val: 94, lvl: "l5" },
      { val: 82, lvl: "l4" },
      { val: 65, lvl: "l3" },
      { val: 58, lvl: "l3" },
      { val: 44, lvl: "l2" }
    ]
  },
  {
    skill: "SDET / Selenium",
    cells: [
      { val: 22, lvl: "l1" },
      { val: 38, lvl: "l2" },
      { val: 76, lvl: "l4" },
      { val: 91, lvl: "l5" },
      { val: 74, lvl: "l4" },
      { val: 41, lvl: "l2" },
      { val: 36, lvl: "l2" },
      { val: 19, lvl: "l1" }
    ]
  },
  {
    skill: "Java Full-Stack",
    cells: [
      { val: 48, lvl: "l2" },
      { val: 62, lvl: "l3" },
      { val: 68, lvl: "l3" },
      { val: 71, lvl: "l3" },
      { val: 66, lvl: "l3" },
      { val: 59, lvl: "l3" },
      { val: 48, lvl: "l2" },
      { val: 42, lvl: "l2" }
    ]
  },
  {
    skill: "Python / ML",
    cells: [
      { val: 35, lvl: "l2" },
      { val: 66, lvl: "l3" },
      { val: 84, lvl: "l4" },
      { val: 93, lvl: "l5" },
      { val: 86, lvl: "l4" },
      { val: 69, lvl: "l3" },
      { val: 47, lvl: "l2" },
      { val: 28, lvl: "l1" }
    ]
  },
  {
    skill: "Cyber Security",
    cells: [
      { val: 18, lvl: "l1" },
      { val: 32, lvl: "l2" },
      { val: 58, lvl: "l3" },
      { val: 78, lvl: "l4" },
      { val: 92, lvl: "l5" },
      { val: 94, lvl: "l5" },
      { val: 61, lvl: "l3" },
      { val: 38, lvl: "l2" }
    ]
  },
  {
    skill: "Cloud · AWS/Azure",
    cells: [
      { val: 38, lvl: "l2" },
      { val: 61, lvl: "l3" },
      { val: 66, lvl: "l3" },
      { val: 78, lvl: "l4" },
      { val: 68, lvl: "l3" },
      { val: 55, lvl: "l3" },
      { val: 42, lvl: "l2" },
      { val: 35, lvl: "l2" }
    ]
  },
  {
    skill: "SAP · Cert Tracks",
    cells: [
      { val: 22, lvl: "l1" },
      { val: 26, lvl: "l1" },
      { val: 38, lvl: "l2" },
      { val: 58, lvl: "l3" },
      { val: 72, lvl: "l4" },
      { val: 76, lvl: "l4" },
      { val: 62, lvl: "l3" },
      { val: 44, lvl: "l2" }
    ]
  },
  {
    skill: "Aptitude / Soft",
    cells: [
      { val: 8, lvl: "l0" },
      { val: 19, lvl: "l1" },
      { val: 34, lvl: "l2" },
      { val: 56, lvl: "l3" },
      { val: 42, lvl: "l2" },
      { val: 25, lvl: "l1" },
      { val: 17, lvl: "l1" },
      { val: 9, lvl: "l0" }
    ]
  },
  {
    skill: "Data Analytics",
    cells: [
      { val: 21, lvl: "l1" },
      { val: 35, lvl: "l2" },
      { val: 48, lvl: "l2" },
      { val: 62, lvl: "l3" },
      { val: 67, lvl: "l3" },
      { val: 59, lvl: "l3" },
      { val: 41, lvl: "l2" },
      { val: 26, lvl: "l1" }
    ]
  },
  {
    skill: "DevOps · CI/CD",
    cells: [
      { val: 17, lvl: "l1" },
      { val: 29, lvl: "l2" },
      { val: 42, lvl: "l2" },
      { val: 55, lvl: "l3" },
      { val: 61, lvl: "l3" },
      { val: 44, lvl: "l2" },
      { val: 28, lvl: "l1" },
      { val: 21, lvl: "l1" }
    ]
  }
];

export const capacityForecast = [
  { quarter: "CURRENT · MAY 26", val: "147 / 86", desc: "Live", nowClass: "now" },
  { quarter: "Q1 · JUN–AUG 26", val: "162 / 86", desc: "+ 18 hire need", valClass: "warn" },
  { quarter: "Q2 · SEP–NOV 26", val: "138 / 92", desc: "Hiring catches up" },
  { quarter: "Q3 · DEC 26 – FEB 27", val: "118 / 96", desc: "Balanced", valClass: "ok" },
  { quarter: "Q4 · MAR–MAY 27", val: "194 / 96", desc: "EOFY semester peak", valClass: "crit" },
  { quarter: "FY28 H1", val: "170 / 110", desc: "Hire plan locked", valClass: "warn" }
];
