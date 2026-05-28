export const clientKpis = [
  { label: "Active Clients", value: "11", sub: "University · Corporate · Internal", style: {} },
  { label: "Trainer-Days Committed", value: "2,840", sub: "Across FY26-Q1 active pipeline", style: {} },
  { label: "Top Client by Demand", value: "Parul Univ.", sub: "42% of total trainer-days", style: { fontSize: "18px" } },
  { label: "Avg Occupancy", value: "68%", sub: "Across all client engagements", style: {} },
  { label: "At-Risk Engagements", value: "3", sub: "SKG · LTI Mumbai · Hexaware", style: { color: "var(--neon-red)" } }
];

export const clientPortfolios = [
  {
    rank: 1,
    rankClass: "rank-1",
    logoText: "PU",
    logoClass: "p",
    name: "Parul University",
    sub: "Vadodara, Gujarat · University Account",
    metrics: [
      { lab: "Trainer-Days", val: "1,194", sub: "42% of total", valStyle: { color: "var(--neon-yellow)" } },
      { lab: "Active Programmes", val: "5", sub: "3 BCA · 2 MBA" },
      { lab: "Occupancy", val: "72%", sub: "Stable" },
      { lab: "Working Days", val: "142", sub: "Across pipeline" }
    ],
    programmes: [
      { name: "Parul-135 · BCA/MCA TT" },
      { name: "Parul-134 · BCA Nerdx" },
      { name: "Parul-MBA-FIN" },
      { name: "Parul-MBA-HR" },
      { name: "+1", isMore: true }
    ],
    status: "On-track",
    statusClass: "ok"
  },
  {
    rank: 2,
    rankClass: "rank-2",
    logoText: "SKG",
    logoClass: "s",
    name: "SKG · Sri Krishna Group",
    sub: "Coimbatore · Engineering Colleges",
    metrics: [
      { lab: "Trainer-Days", val: "628", sub: "22% of total", valStyle: { color: "var(--neon-yellow)" } },
      { lab: "Active Programmes", val: "4", sub: "NerdX · Electives" },
      { lab: "Occupancy", val: "38%", sub: "⚠ Gaps in DSA/Aptitude", valStyle: { color: "var(--neon-red)" } },
      { lab: "Working Days", val: "68", sub: "May–Sep" }
    ],
    programmes: [
      { name: "SKI-100 · NerdX Tech" },
      { name: "SKI-099 · NerdX Apt" },
      { name: "SKG-ML-S5" },
      { name: "SKG-CS-S6" }
    ],
    status: "At-risk",
    statusClass: "warn"
  },
  {
    rank: 3,
    rankClass: "rank-3",
    logoText: "LTI",
    logoClass: "l",
    name: "LTIMindtree",
    sub: "Mumbai · Bhubaneswar · Corporate Training",
    metrics: [
      { lab: "Trainer-Days", val: "418", sub: "15% of total" },
      { lab: "Active Programmes", val: "4", sub: "Java FS · SDET · .NET · CySec" },
      { lab: "Occupancy", val: "85%", sub: "Healthy" },
      { lab: "Working Days", val: "112", sub: "Jun–Sep" }
    ],
    programmes: [
      { name: "LTIM-Mumbai-027" },
      { name: "LTIM-Bhub-038" },
      { name: "LTIM-Bhub-024" },
      { name: "LTM-001" }
    ],
    status: "On-track",
    statusClass: "ok"
  },
  {
    rank: 4,
    rankClass: "",
    logoText: "KCT",
    logoClass: "k",
    name: "Kumaraguru College of Tech.",
    sub: "Coimbatore · NerdX Partnership",
    metrics: [
      { lab: "Trainer-Days", val: "196", sub: "7%" },
      { lab: "Active Programmes", val: "3", sub: "NerdX MS · Internship" },
      { lab: "Occupancy", val: "82%", sub: "Healthy" },
      { lab: "Working Days", val: "42", sub: "Jul–Aug" }
    ],
    programmes: [
      { name: "KCT-MS-B1" },
      { name: "KCT-MS-B2" },
      { name: "KCT-Internship" }
    ],
    status: "On-track",
    statusClass: "ok"
  },
  {
    rank: 5,
    rankClass: "",
    logoText: "REC",
    logoClass: "r",
    name: "Rajalakshmi Engg. College",
    sub: "Chennai · Residential Programmes",
    metrics: [
      { lab: "Trainer-Days", val: "122", sub: "4%" },
      { lab: "Active Programmes", val: "1", sub: "Summer Residential" },
      { lab: "Occupancy", val: "100%", sub: "Fully staffed" },
      { lab: "Working Days", val: "10", sub: "17–26 Jun" }
    ],
    programmes: [
      { name: "REC-001 · Summer Residential Ph1" }
    ],
    status: "On-track",
    statusClass: "ok"
  },
  {
    rank: 6,
    rankClass: "",
    logoText: "HEX",
    logoClass: "h",
    name: "Hexaware",
    sub: "Chennai · Python Mentorship",
    metrics: [
      { lab: "Trainer-Days", val: "86", sub: "3%" },
      { lab: "Active Programmes", val: "2", sub: "Python B3 + B4" },
      { lab: "Occupancy", val: "52%", sub: "⚠ Trainer turnover", valStyle: { color: "var(--neon-yellow)" } },
      { lab: "Working Days", val: "24", sub: "Jun" }
    ],
    programmes: [
      { name: "HEX-B3" },
      { name: "HEX-B4" }
    ],
    status: "At-risk",
    statusClass: "warn"
  },
  {
    rank: 7,
    rankClass: "",
    logoText: "iN",
    logoClass: "i",
    name: "iamneo · Internal",
    sub: "VIT-WILP M.Tech · Exam Reporting",
    metrics: [
      { lab: "Trainer-Days", val: "196", sub: "7%" },
      { lab: "Active Programmes", val: "1", sub: "VIT-WILP M.Tech" },
      { lab: "Occupancy", val: "100%", sub: "All hands" },
      { lab: "Working Days", val: "14", sub: "16–29 May" }
    ],
    programmes: [
      { name: "iamneo-014 · VIT-WILP M.Tech AI/ML" }
    ],
    status: "Ongoing",
    statusClass: "ok"
  }
];
