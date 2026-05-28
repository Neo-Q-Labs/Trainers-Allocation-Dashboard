export default function StatusBar() {
  return (
    <div className="statusbar">
      <div className="sb-group">
        <div className="sb-dot g" />
        Live Sync · OneDrive / Graph
      </div>
      <div className="sb-group">
        <div className="sb-dot b" />
        TLS 1.3 · Encrypted
      </div>
      <div className="sb-spacer" />
      <span className="sb-clock" id="clock">
        UTC 11:48:22 · IST 17:18:22
      </span>
      <span className="sb-version">v0.4.0 · CAPACITY PLANNER</span>
    </div>
  );
}
