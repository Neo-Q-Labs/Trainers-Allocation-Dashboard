import cmdkHtml from '../panels/_cmdk.html?raw';

// CmdK is a stateful overlay; we render the static markup (with all the SVGs
// and command items as authored), and let the global script wire the
// input + click handlers via DOM (it queries by ID/class).
export default function CmdK() {
  return <div dangerouslySetInnerHTML={{ __html: cmdkHtml }} />;
}
