export const overviewKpis = [
  {
    label: "Active Requirements",
    value: "32",
    unit: "live",
    delta: "+5 this week",
    deltaType: "up",
    iconClass: "blue",
    iconType: "requirements"
  },
  {
    label: "Trainers Required",
    value: "147",
    unit: "slots",
    delta: "+18 vs last cycle",
    deltaType: "up",
    iconClass: "purple",
    iconType: "trainers"
  },
  {
    label: "Allocation Complete",
    value: "68",
    unit: "%",
    delta: "+12% vs target",
    deltaType: "up",
    iconClass: "green",
    iconType: "complete"
  },
  {
    label: "Open Gap",
    value: "47",
    unit: "trainers",
    delta: "8 high-risk",
    deltaType: "down",
    iconClass: "yellow",
    iconType: "gap"
  },
  {
    label: "Internal · Freelancer",
    value: "58 / 42",
    unit: "%",
    delta: "Healthy distribution",
    deltaType: "flat",
    iconClass: "cyan",
    iconType: "distribution"
  }
];

export const suggestedActions = [
  {
    title: "Hire 4 DSA freelancers",
    meta: "Parul-135 · 1 Jun → 25 Sep",
    value: "+4",
    valueSub: "Open",
    swatchColor: "red",
    iconType: "warning"
  },
  {
    title: "Replace Surya K",
    meta: "Conflict on 2-5 Jun · 2 swaps",
    value: "2",
    valueSub: "Conflicts",
    swatchColor: "yellow",
    iconType: "replace"
  },
  {
    title: "Close LTIM-Mumbai-028",
    meta: "Azhagu Venkadesh approved",
    value: "100%",
    valueSub: "ready",
    swatchColor: "green",
    iconType: "complete"
  },
  {
    title: "Capacity test: SKI-100",
    meta: "21 trainers needed · 21 days",
    value: "Run",
    valueSub: "Sim",
    swatchColor: "blue",
    iconType: "sim"
  }
];

export const trackCoverages = [
  {
    name: "DSA",
    filled: 38,
    total: 49,
    percent: 78,
    status: ""
  },
  {
    name: "JAVA FS",
    filled: 21,
    total: 34,
    percent: 62,
    status: "warn"
  },
  {
    name: ".NET",
    filled: 9,
    total: 16,
    percent: 55,
    status: "warn"
  },
  {
    name: "SAP",
    filled: 22,
    total: 27,
    percent: 82,
    status: ""
  },
  {
    name: "Cloud / AWS / Azure",
    filled: 7,
    total: 19,
    percent: 38,
    status: "crit"
  },
  {
    name: "SDET",
    filled: 4,
    total: 7,
    percent: 60,
    status: "warn"
  },
  {
    name: "Python · C · C++",
    filled: 29,
    total: 34,
    percent: 85,
    status: ""
  },
  {
    name: "Gen AI",
    filled: 5,
    total: 10,
    percent: 50,
    status: "warn"
  }
];
