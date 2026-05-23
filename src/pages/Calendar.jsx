import html from '../panels/_calendar.html?raw';
import Panel from '../components/Panel.jsx';
export default function Calendar({ active }) {
  return <Panel name="calendar" html={html} active={active} />;
}
