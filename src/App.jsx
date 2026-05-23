import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import PageHead from './components/PageHead.jsx';
import StatusBar from './components/StatusBar.jsx';
import CmdK from './components/CmdK.jsx';
import Modal from './components/Modal.jsx';
import ToastStack from './components/ToastStack.jsx';
import Popover from './components/Popover.jsx';

import Overview from './pages/Overview.jsx';
import Requirements from './pages/Requirements.jsx';
import Calendar from './pages/Calendar.jsx';
import Pending from './pages/Pending.jsx';
import Oasis from './pages/Oasis.jsx';
import Replace from './pages/Replace.jsx';
import Matrix from './pages/Matrix.jsx';
import Clients from './pages/Clients.jsx';
import Conflicts from './pages/Conflicts.jsx';
import Workload from './pages/Workload.jsx';

import { initApp } from './lib/setup.js';

export default function App() {
  const [activePanel, setActivePanel] = useState('overview');

  // Boot the runtime once after the DOM is mounted.
  useEffect(() => {
    initApp({ switchPanel: setActivePanel });
  }, []);

  // Lazy chart builds + scroll on panel switch.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (activePanel === 'workload') window.qlabs?.buildLoadHistogram?.();
  }, [activePanel]);

  const navigate = (t) => setActivePanel(t);
  const openCmdk = () => window.qlabs?.openCmdk?.();

  const handleCmdkClick = (e) => {
    const item = e.target.closest('.cmdk-item[data-target]');
    if (!item) return;
    const t = item.dataset.target;
    if (t) navigate(t);
    window.qlabs?.closeCmdk?.();
  };

  return (
    <>
      <div className="app">
        <Sidebar activePanel={activePanel} onNavigate={navigate} onOpenCmdk={openCmdk} />

        <main className="main">
          <Topbar />
          <PageHead activePanel={activePanel} onOpenCmdk={openCmdk} />

          <Overview active={activePanel === 'overview'} />
          <Requirements active={activePanel === 'requirements'} />
          <Calendar active={activePanel === 'calendar'} />
          <Pending active={activePanel === 'pending'} />
          <Oasis active={activePanel === 'oasis'} />
          <Replace active={activePanel === 'replace'} />
          <Matrix active={activePanel === 'matrix'} />
          <Clients active={activePanel === 'clients'} />
          <Conflicts active={activePanel === 'conflicts'} />
          <Workload active={activePanel === 'workload'} />
        </main>
      </div>

      <div onClick={handleCmdkClick} style={{ display: 'contents' }}>
        <CmdK />
      </div>
      <StatusBar />
      <ToastStack />
      <Modal />
      <Popover />
    </>
  );
}
