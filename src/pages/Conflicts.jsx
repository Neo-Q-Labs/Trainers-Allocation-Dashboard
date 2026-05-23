import html from '../panels/_conflicts.html?raw';
import Panel from '../components/Panel.jsx';
export default function Conflicts({ active }) {
  return <Panel name="conflicts" html={html} active={active} />;
}
