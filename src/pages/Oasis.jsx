import html from '../panels/_oasis.html?raw';
import Panel from '../components/Panel.jsx';
export default function Oasis({ active }) {
  return <Panel name="oasis" html={html} active={active} />;
}
