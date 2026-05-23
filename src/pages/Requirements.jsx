import html from '../panels/_requirements.html?raw';
import Panel from '../components/Panel.jsx';
export default function Requirements({ active }) {
  return <Panel name="requirements" html={html} active={active} />;
}
