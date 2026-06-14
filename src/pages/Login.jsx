import { useState, useEffect, useRef } from 'react';
import { useLoginMutation } from '../store/api.js';

const TERMS = {
  employee: '_ AWAITING_CREDENTIALS',
  admin: 'ADMIN_OVERRIDE · CLEARANCE_REQUIRED',
};

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('teamlead');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [login, { isLoading }] = useLoginMutation();
  const vantaRef = useRef(null);
  const vantaInstance = useRef(null);
  const isAdminMode = role === 'admin';

  // Reset error when typing
  useEffect(() => { setErrorMsg(''); }, [email, password, role]);

  // Mount Vanta GLOBE background (loaded via CDN in index.html)
  useEffect(() => {
    const isLight = document.body.classList.contains('light');
    if (window.VANTA?.GLOBE && vantaRef.current && !vantaInstance.current) {
      vantaInstance.current = window.VANTA.GLOBE({
        el: vantaRef.current,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        scale: 1.0,
        scaleMobile: 1.0,
        color: 0x0325bd,
        color2: isLight ? 0x94a3b8 : 0x3a427b,
        backgroundColor: isLight ? 0xf8fafc : 0x0b0d12,
        size: 1.2,
        points: 10.0,
        maxDistance: 22.0,
        spacing: 16.0,
      });
    }
    return () => {
      if (vantaInstance.current) {
        vantaInstance.current.destroy();
        vantaInstance.current = null;
      }
    };
  }, []);

  // Admin-mode body class drives red-tinted accents on the shell + globe
  useEffect(() => {
    document.body.classList.toggle('admin-mode', isAdminMode);
    return () => document.body.classList.remove('admin-mode');
  }, [isAdminMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both ID and password.');
      return;
    }
    // The backend no longer gates by role — any authenticated user can sign in.
    // We still send the tab's role string so the client can pick Admin theming
    // server-side if needed, but a single request is sufficient.
    try {
      const response = await login({
        email: email.trim(),
        password: password.trim(),
        role,
      }).unwrap();

      if (response?.access_token) {
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
        onLoginSuccess(response.access_token, response.user);
        if (window.showToast) {
          window.showToast('Login Successful', `Welcome back, ${response.user.name}!`, 'ok');
        }
        return;
      }
    } catch (err) {
      const detail = err?.data?.detail || err?.message || 'Invalid credentials. Access denied.';
      setErrorMsg(detail);
      if (window.showToast) {
        window.showToast('Authentication Failed', detail, 'err');
      }
      const form = document.getElementById('ta-login-form');
      if (form) {
        form.classList.add('shake');
        setTimeout(() => form.classList.remove('shake'), 400);
      }
    }
  };

  return (
    <div className="page-login">
      <div className="login-vanta" ref={vantaRef} />
      <div className="login-vignette" />

      <div className="login-shell">
        <div className="login-form-panel">
          <div className="login-heading fade-1">
            <div className="login-tag">{isAdminMode ? 'ADMIN_OVERRIDE' : 'SESSION_INIT'}</div>
            <h2 className="login-title">Trainers Allocation</h2>
            <div className="login-subtitle">Q Labs · Swift Ops</div>
            <div className="login-terminal">
              <span key={role} className="login-terminal-text">
                {isAdminMode ? TERMS.admin : TERMS.employee}
              </span>
            </div>
          </div>

          <div className="login-role-tabs fade-2" role="radiogroup" aria-label="Role">
            <button
              type="button"
              role="radio"
              aria-checked={!isAdminMode}
              className={`login-role-tab${!isAdminMode ? ' is-active' : ''}`}
              onClick={() => setRole('teamlead')}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Employee
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={isAdminMode}
              className={`login-role-tab${isAdminMode ? ' is-active' : ''}`}
              onClick={() => setRole('admin')}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Admin
            </button>
          </div>

          <form id="ta-login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field-group fade-3">
              <div className="login-field">
                <label className="login-field-label" htmlFor="ta-emp-id">
                  {isAdminMode ? 'Manager_ID' : 'Employee_ID'}
                </label>
                <div className="login-input-wrap">
                  <svg className="login-input-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    id="ta-emp-id"
                    type="text"
                    className="login-field-input"
                    placeholder={isAdminMode ? 'admin@neoqlabs.com' : 'neo10394'}
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="login-field">
                <label className="login-field-label" htmlFor="ta-password">Password</label>
                <div className="login-input-wrap">
                  <svg className="login-input-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="ta-password"
                    type={showPassword ? 'text' : 'password'}
                    className="login-field-input"
                    placeholder="••••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="login-pw-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="login-error fade-3">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            <button type="submit" className="login-submit fade-4" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="login-spinner" />
                  Authenticating…
                </>
              ) : (
                'Authenticate'
              )}
            </button>
          </form>

          <div className="login-switch fade-5">
            <span>{isAdminMode ? 'Are you an employee?' : 'Are you an admin?'}</span>
            <button
              type="button"
              className="login-switch-link"
              onClick={() => setRole(isAdminMode ? 'teamlead' : 'admin')}
            >
              {isAdminMode ? ' Employee Login →' : ' Admin Login →'}
            </button>
          </div>

          <div className="login-footer fade-6">
            <div className="login-footer-line">
              Powered by <strong>Neo Q Labs — Swift Ops Training Team</strong>
            </div>
            <div className="login-footer-legal">
              © {new Date().getFullYear()} <strong>Iamneo Edutech Private Limited</strong>. All rights reserved.
            </div>
          </div>
        </div>
      </div>

      <LoginStatusBar />
    </div>
  );
}

function LoginStatusBar() {
  const [time, setTime] = useState(new Date());
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const pad = (v) => String(v).padStart(2, '0');
  const istOffset = 330;
  const ist = new Date(time.getTime() + (time.getTimezoneOffset() + istOffset) * 60000);
  const isDark = theme === 'dark';

  return (
    <div className="login-status-bar">
      <div className="login-status-item">
        <span className="login-status-dot login-status-dot-green" />
        SERVER: ONLINE
      </div>
      <div className="login-status-item">
        <span className="login-status-dot login-status-dot-blue" />
        TLS 1.3 · ENCRYPTED
      </div>
      <div className="login-status-item">
        UTC {pad(time.getUTCHours())}:{pad(time.getUTCMinutes())}:{pad(time.getUTCSeconds())} ·
        IST {pad(ist.getHours())}:{pad(ist.getMinutes())}:{pad(ist.getSeconds())}
      </div>
      <div className="login-status-spacer" />
      <button
        type="button"
        className="login-theme-toggle"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
        {isDark ? 'LIGHT' : 'DARK'}
      </button>
      <div className="login-status-item">v0.4.0 · SWIFT OPS</div>
    </div>
  );
}
