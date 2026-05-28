export const replacementCases = [
  {
    id: 1,
    caseNum: "CASE 01",
    severity: "CRITICAL · Resolve by EOD",
    severityClass: "rc-critical",
    trigger: {
      text: "Surya K is double-booked between LTIM-Bhub-024 (SDET-Java, ongoing) and Parul-135 (DSA, starting 1 Jun).",
      meta: [
        { label: "Conflict window", value: "1 Jun → 19 Jun" },
        { label: "Days overlapping", value: "13" },
        { label: "Current load", value: "96%", valueStyle: { color: "var(--neon-red)" } }
      ]
    },
    swapChain: {
      hops: "2 hops",
      steps: [
        { label: "A", text: "Surya K stays on LTIM-Bhub-024 till 19 Jun", sub: "No change · finishes SDET batch" },
        { label: "B", text: "Vasudevan Badri moves from bench → Parul-135 (DSA)", sub: "DSA track-match ✓ · Available 1–25 Jun" },
        { label: "C", text: "Surya K joins Parul-135 from 20 Jun", sub: "Co-anchors the DSA batch with Vasudevan" }
      ]
    },
    impact: {
      changes: "What changes",
      rows: [
        { label: "Track match", val: "100% · DSA covered by Vasudevan + Surya", isOk: true },
        { label: "Days saved", val: "13 conflict-days resolved", isOk: true },
        { label: "New gap", val: "None · bench absorbs the move", isOk: true },
        { label: "Confidence", val: "92% · clean swap", isOk: true }
      ]
    },
    actions: [
      { label: "Accept", isPrimary: true },
      { label: "Manual Override" },
      { label: "Try Alternative" }
    ],
    footerMeta: "Audit log · ClickUp + Excel · Mythili notified"
  },
  {
    id: 2,
    caseNum: "CASE 02",
    severity: "WARNING · Resolve in 48h",
    severityClass: "rc-warning",
    trigger: {
      text: "Sahil Deswal (ML track owner) approved 5-day leave from 10–14 Jun. SKG-ML-S5 batch starts 10 Jun.",
      meta: [
        { label: "Affected programme", value: "SKG-ML-S5" },
        { label: "Days uncovered", value: "5" },
        { label: "Track", value: "Python · ML" }
      ]
    },
    swapChain: {
      hops: "1 hop",
      steps: [
        { label: "A", text: "Karunya Mohan covers SKG-ML-S5 Days 1–5", sub: "Python ✓ · ML basics ✓ · Currently 43% load" },
        { label: "B", text: "Sahil Deswal resumes from 15 Jun (Day 6)", sub: "Karunya hands off after content checkpoint" }
      ]
    },
    impact: {
      changes: "What changes",
      rows: [
        { label: "Track match", val: "85% · ML deep content held until Sahil returns", isWarn: true },
        { label: "Days saved", val: "5 uncovered days resolved", isOk: true },
        { label: "New gap", val: "Karunya load → 67% during cover", isWarn: true },
        { label: "Confidence", val: "78% · review Sahil's session plan", isWarn: true }
      ]
    },
    actions: [
      { label: "Accept", isPrimary: true },
      { label: "Manual Override" },
      { label: "Try Alternative" }
    ],
    footerMeta: "SPOC: Ramachandramoorthy · auto-Slack scheduled"
  },
  {
    id: 3,
    caseNum: "CASE 03",
    severity: "OPTIMISATION · No urgency",
    severityClass: "rc-info",
    trigger: {
      text: "Anshul Mishra (89% load) is currently solo on Parul-134 while Manopalaniraja A is at 22% with same track skills.",
      meta: [
        { label: "Imbalance", value: "67% load delta" },
        { label: "Programme", value: "Parul-134 · BCA Nerdx" },
        { label: "Track", value: "DSA" }
      ]
    },
    swapChain: {
      hops: "1 hop · split load",
      steps: [
        { label: "A", text: "Add Manopalaniraja A as co-anchor on Parul-134", sub: "DSA ✓ · 18% load · gets meaningful engagement" },
        { label: "B", text: "Anshul shifts 40% session load to Manopalaniraja", sub: "Better content depth · feedback faster" }
      ]
    },
    impact: {
      changes: "What changes",
      rows: [
        { label: "Load balance", val: "Anshul 89%→55% · Mano 22%→48%", isOk: true },
        { label: "Track depth", val: "Stronger · 2 anchors vs 1", isOk: true },
        { label: "New gap", val: "None · purely load redistribution", isOk: true },
        { label: "Confidence", val: "96% · low-risk reshuffle", isOk: true }
      ]
    },
    actions: [
      { label: "Accept", isPrimary: true },
      { label: "Manual Override" },
      { label: "Dismiss · keep as-is" }
    ],
    footerMeta: "No external notification needed"
  }
];

export const swapHistory = [
  {
    time: "21 May · 18:42",
    body: "Bandewar Sai Raghavendra → covers HEX-B3 for 2 days · accepted by Karan D",
    tag: "APPLIED",
    tagClass: "ok"
  },
  {
    time: "21 May · 11:15",
    body: "Keerthipati Sowmya moves from VIT-WILP → Parul-MBA-HR kickoff · accepted by Poomanirajan M",
    tag: "APPLIED",
    tagClass: "ok"
  },
  {
    time: "20 May · 16:30",
    body: "Abinaya P backfill on Parul-134 rejected · escalated to Ramesh Berkmans",
    tag: "ESCALATED",
    tagClass: "warn"
  },
  {
    time: "20 May · 09:48",
    body: "Jenifer Rohini R & Sahil Deswal co-anchor swap on SKG-ML · accepted",
    tag: "APPLIED",
    tagClass: "ok"
  }
];
