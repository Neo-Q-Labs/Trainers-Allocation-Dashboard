import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import StatusBar from './components/StatusBar.jsx';
import CmdK from './components/CmdK.jsx';
import Modal from './components/Modal.jsx';
import ToastStack from './components/ToastStack.jsx';
import Popover from './components/Popover.jsx';
import NewRequirementSimulator from './components/NewRequirementSimulator.jsx';

import Overview from './pages/Overview.jsx';
import Requirements from './pages/Requirements.jsx';
import Calendar from './pages/Calendar.jsx';
import Pending from './pages/Pending.jsx';
import Matrix from './pages/Matrix.jsx';
import Clients from './pages/Clients.jsx';
import Conflicts from './pages/Conflicts.jsx';
import Oasis from './pages/Oasis.jsx';
import Login from './pages/Login.jsx';

import { initApp } from './lib/setup.js';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [activePanel, setActivePanel] = useState('overview');
  const [simOpen, setSimOpen] = useState(false);

  // Load user from localStorage once on boot if token is present
  useEffect(() => {
    if (token) {
      try {
        const u = localStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
      } catch (err) {
        console.error('Failed to parse user details from local storage:', err);
      }
    }
  }, [token]);

  // Setup automated logout event listener for 401 re-auth triggers
  useEffect(() => {
    const handleLogout = () => {
      setToken('');
      setUser(null);
    };
    window.addEventListener('auth-logout', handleLogout);
    return () => window.removeEventListener('auth-logout', handleLogout);
  }, []);

  // Boot the runtime once after the DOM is mounted and user is authenticated.
  useEffect(() => {
    if (token) {
      initApp({ switchPanel: setActivePanel });
    }
  }, [token]);

  // Scroll to top on panel switch.
  useEffect(() => {
    if (token) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activePanel, token]);

  const navigate = (t) => setActivePanel(t);
  const openCmdk = () => window.qlabs?.openCmdk?.();

  const handleCmdkClick = (e) => {
    const item = e.target.closest('.cmdk-item[data-target]');
    if (!item) return;
    const t = item.dataset.target;
    if (t) navigate(t);
    window.qlabs?.closeCmdk?.();
  };

  // Redirection: Block dashboard panels if the user is unauthenticated
  if (!token) {
    return (
      <>
        <Login onLoginSuccess={(tok, usr) => { setToken(tok); setUser(usr); }} />
        <ToastStack />
      </>
    );
  }

  return (
    <>
      <div className="app">
        <Sidebar user={user} activePanel={activePanel} onNavigate={navigate} onOpenCmdk={openCmdk} />

        <main className="main">
          <Topbar user={user} activePanel={activePanel} />

          <Overview active={activePanel === 'overview'} />
          <Requirements active={activePanel === 'requirements'} onNewRequirement={() => setSimOpen(true)} />
          <Calendar active={activePanel === 'calendar'} />
          <Pending active={activePanel === 'pending'} />
          <Matrix active={activePanel === 'matrix'} />
          <Clients active={activePanel === 'clients'} />
          <Conflicts active={activePanel === 'conflicts'} />
          <Oasis active={activePanel === 'oasis'} />
        </main>
      </div>

      <div onClick={handleCmdkClick} style={{ display: 'contents' }}>
        <CmdK />
      </div>
      <StatusBar />
      <ToastStack />
      <Modal />
      <Popover />
      <NewRequirementSimulator open={simOpen} onClose={() => setSimOpen(false)} />
    </>
  );
}
