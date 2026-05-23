import html from '../panels/_clients.html?raw';
import Panel from '../components/Panel.jsx';
export default function Clients({ active }) {
  return <Panel name="clients" html={html} active={active} />;
}
