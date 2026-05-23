import html from '../panels/_pending.html?raw';
import Panel from '../components/Panel.jsx';
export default function Pending({ active }) {
  return <Panel name="pending" html={html} active={active} />;
}
