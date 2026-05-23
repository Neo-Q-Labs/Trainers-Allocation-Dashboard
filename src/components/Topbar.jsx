export default function Topbar() {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-dot" />
        <div className="brand-name">iamneo</div>
        <div className="brand-divider" />
        <div className="brand-page">Swift Ops · Capacity Planner</div>
      </div>
      <div className="topbar-spacer" />
      <div className="topbar-right">
        <div className="sync-pill">
          <span className="sync-dot" />
          Live Excel Sync · 12s ago
        </div>
      </div>
    </div>
  );
}
