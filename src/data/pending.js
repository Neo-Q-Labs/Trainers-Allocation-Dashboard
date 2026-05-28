export const pendingKpis = [
  { label: "Open Slots", value: "12", sub: "Across 7 programmes", style: { color: "var(--neon-red)" } },
  { label: "Urgent (< 7 Days)", value: "8", sub: "Start before 29 May", style: { color: "var(--neon-red)" } },
  { label: "Trainer-Days Needed", value: "214", sub: "Cumulative across the pipeline", style: { color: "var(--neon-yellow)" } },
  { label: "Tracks Affected", value: "5", sub: "DSA · Aptitude · Cy.Sec · Java FS · Cloud", style: {} },
  { label: "Auto-Suggested Fills", value: "9", sub: "75% have a clean candidate", style: { color: "var(--neon-green)" } }
];

export const pendingSlots = [
  {
    id: "SKI-099",
    name: "NerdX Aptitude Track",
    client: "SKG",
    window: "21 May → 31 May",
    track: "Aptitude · Quants",
    gap: 14,
    gapLabel: "trainers missing",
    filled: 7,
    total: 21,
    percent: 33,
    progressClass: "crit",
    suggestedLabel: "AUTO-SUGGESTED · 3 candidates",
    chips: [
      "Karunya Mohan · 14% load · ✓ track-match",
      "Bindhiya J · 33% load · ✓ track-match"
    ],
    hasAlt: true,
    altChip: "+1 freelancer (Abdul S.)",
    urgencyText: "0 days to start · highest priority",
    urgencyClass: "urgent",
    isUrgent: true,
    actionsType: "standard"
  },
  {
    id: "SKI-100",
    name: "NerdX Tech Track",
    client: "SKG",
    window: "21 May → 26 Jun",
    track: "DSA · Logic Building",
    gap: 17,
    gapLabel: "trainers missing",
    filled: 4,
    total: 21,
    percent: 19,
    progressClass: "crit",
    suggestedLabel: "AUTO-SUGGESTED · 4 candidates",
    chips: [
      "Vasudevan Badri · 14% load · ✓ DSA",
      "Manopalaniraja A · 22% load · ✓ DSA",
      "Aravindhan S · 18% load · ✓ DSA"
    ],
    hasAlt: true,
    altChip: "+1 freelancer (Praveen K.)",
    urgencyText: "0 days to start · highest priority",
    urgencyClass: "urgent",
    isUrgent: true,
    actionsType: "standard"
  },
  {
    id: "Parul-135",
    name: "BCA/MCA · TT Integrated",
    client: "Parul University",
    window: "1 Jun → 25 Sep",
    track: "DSA · OS · Aptitude",
    gap: 4,
    gapLabel: "trainers missing",
    filled: 6,
    total: 10,
    percent: 60,
    progressClass: "warn",
    suggestedLabel: "AUTO-SUGGESTED · 2 candidates",
    chips: [
      "Sai Raghavendra B · 38% load · ✓ track-match",
      "Preethika TND · 22% load · ✓ track-match"
    ],
    hasAlt: false,
    urgencyText: "10 days to start",
    urgencyClass: "warn",
    isUrgent: false,
    actionsType: "standard"
  },
  {
    id: "LTIM-Bhub-024",
    name: "SDET Java · Batch 2",
    client: "LTIMindtree",
    window: "8 Jun → 19 Jun",
    track: "SDET · Java · Selenium",
    gap: 1,
    gapLabel: "trainer missing",
    filled: 3,
    total: 4,
    percent: 75,
    progressClass: "warn",
    suggestedLabel: "AUTO-SUGGESTED · 1 candidate",
    chips: [
      "Surya K · 96% load · ⚠ near-capacity"
    ],
    hasAlt: true,
    altChip: "Open replacement engine for swap",
    urgencyText: "17 days to start",
    urgencyClass: "warn",
    isUrgent: false,
    actionsType: "replace"
  },
  {
    id: "LTM-001",
    name: "LTM Internship · CySec",
    client: "LTIMindtree Mumbai",
    window: "22 Jun → 4 Jul",
    track: "Cyber · Forensics",
    gap: 2,
    gapLabel: "trainers missing",
    filled: 1,
    total: 3,
    percent: 33,
    progressClass: "crit",
    suggestedLabel: "AUTO-SUGGESTED · 2 candidates",
    chips: [
      "Yogeshwaran K · 31% load · ✓ Cy.Sec owner"
    ],
    hasAlt: true,
    altChip: "+1 freelancer (Tomy A.)",
    urgencyText: "31 days to start",
    urgencyClass: "",
    isUrgent: false,
    actionsType: "standard"
  }
];
