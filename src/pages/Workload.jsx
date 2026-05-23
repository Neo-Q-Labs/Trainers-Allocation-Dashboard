import html from '../panels/_workload.html?raw';
import Panel from '../components/Panel.jsx';
export default function Workload({ active }) {
  return <Panel name="workload" html={html} active={active} />;
}
