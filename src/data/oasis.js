export const oasisFormDefaults = {
  deliveryName: "LTI Mumbai · JAVA FS Pilot Batch",
  client: "LTI",
  track: "JAVA Full Stack",
  from: "2026-06-01",
  to: "2026-06-15",
  trainers: 5
};

export const simulatorResult = {
  achievable: "Partially achievable · stagger required",
  achievableClass: "warn",
  headline: "5 trainers requested · 3 fully available · 2 partial · 0 hard conflicts",
  details: [
    { label: "Full availability", val: "3", sub: "Internal · matched skill", valClass: "good" },
    { label: "Staggered fits", val: "2", sub: "Available 1-5 / 8-15 Jun", valClass: "warn" },
    { label: "Replacement opens", val: "4", sub: "Cross-skill swaps possible" },
    { label: "Hire recommendation", val: "0", sub: "Bench can absorb" }
  ]
};

export const candidateSuggestions = [
  {
    name: "Siva Prasanna S",
    avatar: "SP",
    avatarColorClass: "green",
    id: "neo10221",
    type: "Internal Fulltime",
    skills: [
      { name: "Java FS", match: true },
      { name: "React", match: true },
      { name: "Angular", match: false }
    ],
    fit: 98,
    fitLabel: "Fit",
    suggested: true,
    fitColorStyle: {}
  },
  {
    name: "Anthony Sahaya Michael M",
    avatar: "AM",
    avatarColorClass: "",
    id: "neo10166",
    type: "Internal SME",
    skills: [
      { name: "Java FS", match: true },
      { name: "Angular", match: true },
      { name: ".NET", match: false }
    ],
    fit: 94,
    fitLabel: "Fit",
    suggested: true,
    fitColorStyle: {}
  },
  {
    name: "Manoj Kumar",
    avatar: "MK",
    avatarColorClass: "cyan",
    id: "neo10402",
    type: "Internal Fulltime",
    skills: [
      { name: "Java FS", match: true },
      { name: "SDET", match: false }
    ],
    fit: 92,
    fitLabel: "Fit",
    suggested: true,
    fitColorStyle: {}
  },
  {
    name: "Harshada Rajput",
    avatar: "HR",
    avatarColorClass: "yellow",
    id: "neo10420",
    type: "Internal Fulltime",
    skills: [
      { name: "Java FS", match: true },
      { name: "SDET-Java", match: false }
    ],
    fit: 71,
    fitLabel: "Partial · 8-15 Jun",
    suggested: false,
    fitColorStyle: { color: "var(--neon-yellow)" }
  },
  {
    name: "Kumar Raghuveer R A",
    avatar: "KR",
    avatarColorClass: "",
    id: "neo10320",
    type: "Internal Fulltime",
    skills: [
      { name: "Java FS", match: true },
      { name: "Spring Boot", match: false }
    ],
    fit: 68,
    fitLabel: "Partial · 1-5 Jun",
    suggested: false,
    fitColorStyle: { color: "var(--neon-yellow)" }
  },
  {
    name: "Ritwik Roy",
    avatar: "RR",
    avatarColorClass: "",
    id: "FRL-0184",
    type: "Freelancer · Bench",
    isFreelancer: true,
    skills: [
      { name: "Java FS", match: true },
      { name: "REACT", match: false }
    ],
    fit: 86,
    fitLabel: "Freelancer Fit",
    suggested: false,
    fitColorStyle: {}
  }
];
