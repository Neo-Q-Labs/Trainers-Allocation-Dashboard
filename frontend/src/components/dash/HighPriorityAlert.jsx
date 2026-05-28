/* HighPriorityAlert — derives a single actionable headline from the
   highest-risk pending slots + open conflict count. */
export default function HighPriorityAlert({ pending = {}, conflicts = 0, onOpenOasis }) {
  const slots = pending?.slots || [];
  const highRisk = slots.filter((p) => (Number(p.percent) || 0) < 33).length;

  const headline =
    highRisk > 0  ? `${highRisk} high-risk request${highRisk === 1 ? '' : 's'} have gaps within the next 14 days`
                  : conflicts > 0 ? `${conflicts} open conflicts need attention`
                  : 'No critical alerts right now';

  const body =
    highRisk > 0 || conflicts > 0
      ? 'Run OASIS to test feasibility, or use the Replacement Engine to redistribute load.'
      : 'Every active request is on track. Keep monitoring the demand curve.';

  return (
    <div className={`dash-card dash-alert${highRisk > 0 ? ' is-high' : ''}`}>
      <div className="dash-alert-bar" aria-hidden="true" />
      <div className="dash-alert-body">
        <div className="dash-alert-head">
          <span className="dash-alert-label">HIGH-PRIORITY ALERT</span>
        </div>
        <div className="dash-alert-headline">{headline}</div>
        <div className="dash-alert-text">{body}</div>
        {(highRisk > 0 || conflicts > 0) && (
          <button type="button" className="dash-alert-cta" onClick={onOpenOasis}>
            Open OASIS →
          </button>
        )}
      </div>
    </div>
  );
}
