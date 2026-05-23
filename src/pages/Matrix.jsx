import html from '../panels/_matrix.html?raw';
import Panel from '../components/Panel.jsx';
export default function Matrix({ active }) {
  return <Panel name="matrix" html={html} active={active} />;
}
