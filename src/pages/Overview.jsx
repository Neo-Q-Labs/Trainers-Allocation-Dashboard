import html from '../panels/_overview.html?raw';
import Panel from '../components/Panel.jsx';
export default function Overview({ active }) {
  return <Panel name="overview" html={html} active={active} />;
}
