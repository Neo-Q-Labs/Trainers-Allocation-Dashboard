export const conflictKpis = [
  {
    label: "Active Conflicts",
    value: "7",
    trend: "3 critical · 4 warning",
    iconClass: "crit",
    iconBg: "rgba(239,68,68,0.12)",
    iconColor: "var(--neon-red)",
    iconType: "conflict"
  },
  {
    label: "Resolved · Wk 21",
    value: "12",
    trend: "↑ 4 vs last week",
    iconClass: "ok",
    iconBg: "rgba(34,211,165,0.12)",
    iconColor: "var(--neon-green)",
    iconType: "resolved"
  },
  {
    label: "Avg Resolution Time",
    value: "1.8",
    unit: "d",
    trend: "↓ 0.4d vs Apr",
    iconClass: "",
    iconBg: "",
    iconColor: "",
    iconType: "clock"
  },
  {
    label: "Pending Hire Request",
    value: "3",
    trend: "DSA · SDET-Java · Cloud",
    iconClass: "warn",
    iconBg: "rgba(245,197,66,0.12)",
    iconColor: "var(--neon-yellow)",
    iconType: "pending"
  },
  {
    label: "Auto-Resolved (AI)",
    value: "61",
    unit: "%",
    trend: "of 18 suggestions accepted",
    iconClass: "",
    iconBg: "",
    iconColor: "",
    iconType: "auto"
  }
];

export const activeConflicts = [
  {
    id: 1,
    avatar: "SK",
    avatarClass: "conf",
    name: "Surya K",
    meta: "neo10376 · Internal · DSA / SDET-Java",
    severity: "Critical · Overlap",
    severityClass: "crit",
    type: "overlap",
    leftLeg: {
      id: "SKI-100",
      name: "NerdX Tech · DSA Foundation",
      meta: ["02 Jun → 27 Jun", "Priority P1", "21 trainers"]
    },
    relation: "VS",
    rightLeg: {
      id: "LTIM-Bhub-024",
      name: "Bhubaneswar · SDET Java Batch 2",
      meta: ["08 Jun → 19 Jun", "Priority P0", "Onsite required"]
    },
    suggestion: "Suggested: Pull Surya K to LTIM-Bhub (P0, onsite), backfill SKI-100 with Vasudevan Badri (neo10371) + Bindhiya J (neo10457). Skill match 94%. Confidence 91%.",
    actions: ["Manual", "Accept"],
    primaryAction: "Accept",
    cardClass: ""
  },
  {
    id: 2,
    avatar: "SD",
    avatarClass: "conf",
    name: "Sahil Deswal",
    meta: "neo10408 · Internal · ML / Python · SKG-Lead",
    severity: "Critical · Over-allocation",
    severityClass: "crit",
    type: "over-allocation",
    leftLeg: {
      id: "SKI-099",
      name: "Aptitude Drive · Mock Series",
      meta: ["03 Jun → 14 Jun", "14-day load", "112% util"]
    },
    relation: "+",
    rightLeg: {
      id: "SKG-ML-S5",
      name: "SKG Electives · ML Track Sem 5",
      meta: ["10 Jun → 28 Jun", "Course Owner", "Cannot delegate"]
    },
    suggestion: "Suggested: Reassign SKI-099 to Karunya Mohan (neo10396) — Python skill match 88%, available days 12. Sahil keeps SKG-ML-S5 as Course Owner. Confidence 84%.",
    actions: ["Manual", "Accept"],
    primaryAction: "Accept",
    cardClass: ""
  },
  {
    id: 3,
    avatar: "YK",
    avatarClass: "conf",
    name: "Yogeshwaran Kumaran",
    meta: "neo10417 · Internal · Cyber Security",
    severity: "Critical · Travel Clash",
    severityClass: "crit",
    type: "travel-clash",
    leftLeg: {
      id: "SKG-CS-S6",
      name: "SKG · CySec Sem 6 · Coimbatore",
      meta: ["15 Jun → 26 Jun", "Onsite KCT"]
    },
    relation: "VS",
    rightLeg: {
      id: "LTM-001",
      name: "LTM Internship · Cybersec Track",
      meta: ["22 Jun → 04 Jul", "Mumbai · onsite"]
    },
    suggestion: "No internal cyber-sec backup available. Suggested: extend LTM-001 by 5 days (no priority loss) so YK finishes SKG-CS-S6 first. Alternative: raise freelancer request for CySec mid-level. Confidence 67%.",
    actions: ["Escalate", "Hire"],
    primaryAction: "Hire",
    cardClass: ""
  },
  {
    id: 4,
    avatar: "AM",
    avatarClass: "",
    name: "Anshul Mishra",
    meta: "neo10498 · Internal · DSA",
    severity: "Warning · Skill Match",
    severityClass: "warn",
    type: "skill-match",
    leftLeg: {
      id: "Parul-135",
      name: "BCA/MCA TT Integrated DSA",
      meta: ["01 Jun → 25 Sep", "Skill match 78%"]
    },
    relation: "→",
    rightLeg: {
      id: "Backup",
      name: "Original allocation gap of 4",
      meta: ["Needs 2 more", "Long-running 16 wks"]
    },
    suggestion: "Long-duration program (16 wks). Suggested: pair Anshul with Abinaya P (neo10400) as primary instructor + Anshul as TA-lead for first 4 wks, ramp to co-lead. Reduces single-skill risk. Confidence 79%.",
    actions: ["Manual", "Accept"],
    primaryAction: "Accept",
    cardClass: "warn"
  },
  {
    id: 5,
    avatar: "AP",
    avatarClass: "",
    name: "Abinaya P",
    meta: "neo10400 · Internal · C / DSA",
    severity: "Warning · Under-utilised",
    severityClass: "warn",
    type: "under-utilised",
    leftLeg: {
      id: "Bench",
      name: "Available · idle days through Jun",
      meta: ["19 days / 21", "9% load"]
    },
    relation: "→",
    rightLeg: {
      id: "REC-001",
      name: "Rajalakshmi Summer Camp",
      meta: ["10 Jun → 24 Jun", "Needs 4 more"]
    },
    suggestion: "Skill alignment 91%. Move Abinaya to REC-001 with Bindhiya J + 2 freelancers. Frees freelancer budget. Confidence 86%.",
    actions: ["Manual", "Accept"],
    primaryAction: "Accept",
    cardClass: "warn"
  }
];

export const conflictProneDays = [
  { day: "Wed 11 Jun", desc: "Peak overlap · SKI-100 + LTIM-027 + Parul-135", count: 12, severity: "crit" },
  { day: "Thu 12 Jun", desc: "Cyber + DSA double-book", count: 11, severity: "crit" },
  { day: "Tue 17 Jun", desc: "SAP + LTIM + REC-001 collision", count: 10, severity: "crit" },
  { day: "Mon 09 Jun", desc: "SDET-Java + .NET overlap", count: 8, severity: "warn" },
  { day: "Wed 18 Jun", desc: "Cloud + DA mid-batch swap", count: 7, severity: "warn" },
  { day: "Fri 20 Jun", desc: "SKG Electives kickoff", count: 6, severity: "warn" }
];

export const resolutionLogs = [
  { time: "14:18 IST", status: "Resolved", statusClass: "ok", text: "Aravindhan S moved KCT-008 → KCT-009. Auto-suggested, accepted." },
  { time: "11:42 IST", status: "Updated", statusClass: "info", text: "Hire request for SDET-Java raised to HR — JD ref HR-2026-0411." },
  { time: "10:20 IST", status: "Escalated", statusClass: "warn", text: "YK travel clash to Poomanirajan M for L1 review." },
  { time: "09:35 IST", status: "Resolved", statusClass: "ok", text: "Manoj Kumar reassigned from Parul-134 (closed) to KCT-009." },
  { time: "Yest 18:02", status: "Backfill", statusClass: "info", text: "2 freelancers onboarded against Cloud Azure .Net gap." },
  { time: "Yest 15:18", status: "Resolved", statusClass: "ok", text: "SAP S/4HANA QC gap covered by Karan + Sai Deepak D Y rotation." }
];

export const crossSkillsMap = [
  { path: "DSA → SDET-Java", desc: "Conversion compatibility", percent: 84, barClass: "" },
  { path: "Python → ML", desc: "Conversion compatibility", percent: 78, barClass: "" },
  { path: "C → DSA", desc: "Conversion compatibility", percent: 91, barClass: "low" },
  { path: "Aptitude → DSA", desc: "Conversion compatibility", percent: 62, barClass: "warn" },
  { path: "Cyber → Cloud", desc: "Conversion compatibility", percent: 41, barClass: "crit" }
];
