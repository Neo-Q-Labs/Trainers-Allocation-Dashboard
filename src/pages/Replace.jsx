import html from '../panels/_replace.html?raw';
import Panel from '../components/Panel.jsx';
export default function Replace({ active }) {
  return <Panel name="replace" html={html} active={active} />;
}
