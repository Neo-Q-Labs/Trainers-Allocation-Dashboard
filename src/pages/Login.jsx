import { useState, useEffect } from 'react';
import { useLoginMutation } from '../store/api.js';

const TEXTS = {
  brandTitle: 'TRAINERS ALLOCATION',
  brandSubtitle: 'Q LABS · SWIFT OPS',
  mainTitle: 'Trainers Allocation',
  labelEmployee: 'Employee',
  labelAdmin: 'Admin',
  labelPassword: 'PASSWORD',
  btnAuthenticate: 'AUTHENTICATE',
  tipAdminQuestion: 'Are you an admin? ',
  tipAdminLink: 'Admin Login →',
  tipEmployeeQuestion: 'Are you an employee? ',
  tipEmployeeLink: 'Employee Login →'
};

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('teamlead'); // 'teamlead' (Employee) or 'admin' (Admin)
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [login, { isLoading }] = useLoginMutation();

  // Reset error when user starts typing
  useEffect(() => {
    setErrorMsg('');
  }, [email, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      const response = await login({
        email: email.trim(),
        password: password.trim(),
        role: role
      }).unwrap();

      if (response && response.access_token) {
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        onLoginSuccess(response.access_token, response.user);
        
        if (window.showToast) {
          window.showToast('Login Successful', `Welcome back, ${response.user.name}!`, 'ok');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      const detail = err?.data?.detail || err?.message || 'Invalid email or password.';
      setErrorMsg(detail);
      if (window.showToast) {
        window.showToast('Authentication Failed', detail, 'err');
      }
    }
  };

  return (
    <div className="auth-view-container">
      {/* Top Header Branding Bar */}
      <div className="auth-top-header">
        <div className="auth-brand-info">
          <div className="auth-brand-logo">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
          </div>
          <div className="auth-brand-text">
            <div className="auth-brand-title">{TEXTS.brandTitle}</div>
            <div className="auth-brand-subtitle">{TEXTS.brandSubtitle}</div>
          </div>
        </div>

        <div className="auth-bridge-badge">
          <span className="bridge-badge-dot"></span>
          AUTHENTICATION_BRIDGE_ACTIVE
        </div>
      </div>

      {/* Centered Glassmorphic Panel Container */}
      <div className="auth-panel-card">
        <div className="auth-header-section">
          <span className={`auth-session-init-label ${role === 'admin' ? 'admin-theme-red' : ''}`}>
            {role === 'admin' ? '— ADMIN_OVERRIDE' : '— SESSION_INIT'}
          </span>
          <h1 className="auth-main-title">{TEXTS.mainTitle}</h1>
          <div className={`auth-awaiting-status ${role === 'admin' ? 'admin-theme-red' : ''}`}>
            <span className="auth-status-text">
              &gt;_ {isLoading 
                ? (role === 'admin' ? 'OVERRIDING' : 'AUTHENTICATING')
                : (role === 'admin' ? 'ADMIN_OVERRIDE_CL' : 'AWAITING_CREDENTIALS')}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form-body">
          {/* Custom Pill Segment Selector */}
          <div className="auth-role-tabs" role="radiogroup" aria-label="Select Login Category">
            <button
              type="button"
              role="radio"
              aria-checked={role === 'teamlead'}
              className={`auth-tab-btn ${role === 'teamlead' ? 'active' : ''}`}
              onClick={() => setRole('teamlead')}
            >
              <svg className="tab-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{TEXTS.labelEmployee}</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={role === 'admin'}
              className={`auth-tab-btn ${role === 'admin' ? 'active admin-tab-active' : ''}`}
              onClick={() => setRole('admin')}
            >
              <svg className="tab-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>{TEXTS.labelAdmin}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="auth-alert-message">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="alert-svg">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Employee ID / Admin ID input */}
          <div className="auth-form-field">
            <label className="auth-field-label">
              {role === 'admin' ? 'MANAGER_ID' : 'EMPLOYEE_ID'}
            </label>
            <div className="auth-field-wrapper">
              <span className="auth-field-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                type="text"
                className="auth-input-element"
                placeholder="User Identifier"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="auth-form-field">
            <label className="auth-field-label">{TEXTS.labelPassword}</label>
            <div className="auth-field-wrapper">
              <span className="auth-field-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input-element"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Authenticate Button */}
          <button
            type="submit"
            className={`auth-submit-btn ${role === 'admin' ? 'admin-red-btn' : ''} ${isLoading ? 'submitting' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="auth-spinner"></span>
            ) : (
              <span>{TEXTS.btnAuthenticate}</span>
            )}
          </button>
        </form>

        {/* Secondary Navigation */}
        <div className="auth-switch-tip">
          {role === 'teamlead' ? (
            <span>
              {TEXTS.tipAdminQuestion}
              <button 
                type="button" 
                className="auth-link-trigger"
                onClick={() => setRole('admin')}
              >
                {TEXTS.tipAdminLink}
              </button>
            </span>
          ) : (
            <span>
              {TEXTS.tipEmployeeQuestion}
              <button 
                type="button" 
                className="auth-link-trigger admin-red-link"
                onClick={() => setRole('teamlead')}
              >
                {TEXTS.tipEmployeeLink}
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Styled JSX Stylesheet */}
      <style>{`
        .auth-view-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: #08090C;
          background-image: radial-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 24px 24px;
          background-position: center;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999999;
          font-family: 'Nunito', system-ui, sans-serif;
          overflow: hidden;
        }

        /* ------------------------------------------------------------
           Top Header Branding Bar
           ------------------------------------------------------------ */
        .auth-top-header {
          position: absolute;
          top: 24px;
          left: 24px;
          right: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 100;
        }
        .auth-brand-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .auth-brand-logo {
          width: 38px;
          height: 38px;
          background: #173FE6;
          border-radius: 8px;
          display: grid;
          place-items: center;
          color: #FFFFFF;
        }
        .auth-brand-logo svg {
          width: 18px;
          height: 18px;
          stroke: currentColor;
          fill: currentColor;
        }
        .auth-brand-text {
          display: flex;
          flex-direction: column;
        }
        .auth-brand-title {
          font-family: 'Nunito', sans-serif;
          font-size: 13.5px;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #FFFFFF;
          line-height: 1.2;
        }
        .auth-brand-subtitle {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #4A5568;
          margin-top: 2px;
        }
        .auth-bridge-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(16, 185, 129, 0.22);
          border-radius: 99px;
          padding: 6px 14px;
          color: #10B981;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.06em;
          background: rgba(16, 185, 129, 0.04);
        }
        .bridge-badge-dot {
          width: 5px;
          height: 5px;
          background: #10B981;
          border-radius: 50%;
          box-shadow: 0 0 6px #10B981;
        }

        /* ------------------------------------------------------------
           Main Panel Box Card
           ------------------------------------------------------------ */
        .auth-panel-card {
          width: min(420px, 92%);
          background: #13161C;
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 20px;
          padding: 40px 32px;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.7);
          position: relative;
          z-index: 10;
        }

        /* Header elements */
        .auth-header-section {
          margin-bottom: 26px;
        }
        .auth-session-init-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #4A5568;
          display: block;
          margin-bottom: 6px;
        }
        .auth-main-title {
          font-size: 26px;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0 0 8px;
          letter-spacing: -0.01em;
        }
        .auth-awaiting-status {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          color: #10B981;
          text-shadow: 0 0 8px rgba(16, 185, 129, 0.15);
          letter-spacing: 0.04em;
        }

        /* Form Layout */
        .auth-form-body {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* custom tab buttons list */
        .auth-role-tabs {
          display: flex;
          gap: 2px;
          background: #090B0E;
          border: 1px solid rgba(255, 255, 255, 0.02);
          border-radius: 99px;
          padding: 3px;
          margin-bottom: 4px;
        }
        .auth-tab-btn {
          flex: 1;
          background: transparent;
          border: none;
          color: #4A5568;
          padding: 8px 12px;
          border-radius: 99px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: 'Nunito', sans-serif;
          font-size: 13px;
          font-weight: 700;
          transition: all 0.2s ease;
        }
        .tab-icon {
          width: 14px;
          height: 14px;
          stroke: currentColor;
          fill: none;
        }
        .auth-tab-btn:hover:not(.active) {
          color: #718096;
        }
        .auth-tab-btn.active {
          background: #1C222C;
          color: #FFFFFF;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.02);
        }
        .auth-tab-btn.active.admin-tab-active {
          background: #850B0B;
          box-shadow: 0 4px 12px rgba(133, 11, 11, 0.45);
        }
        .admin-theme-red {
          color: #EF4444 !important;
          text-shadow: 0 0 8px rgba(239, 68, 68, 0.25) !important;
        }

        /* Alert message */
        .auth-alert-message {
          background: rgba(239, 68, 68, 0.07);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 10px;
          padding: 10px 12px;
          color: #FCA5A5;
          font-size: 12.5px;
          display: flex;
          align-items: center;
          gap: 8px;
          line-height: 1.4;
        }
        .alert-svg {
          stroke: #EF4444;
          flex-shrink: 0;
        }

        /* Form Inputs */
        .auth-form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .auth-field-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #4A5568;
        }
        .auth-field-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .auth-field-icon {
          position: absolute;
          left: 12px;
          display: grid;
          place-items: center;
          color: #4A5568;
          pointer-events: none;
        }
        .auth-field-icon svg {
          width: 15px;
          height: 15px;
          stroke: currentColor;
          fill: none;
        }
        .auth-input-element {
          width: 100%;
          background: #090B0E;
          border: 1px solid #1E2530;
          border-radius: 10px;
          padding: 11px 12px 11px 36px;
          color: #FFFFFF;
          font-size: 13.5px;
          outline: none;
          font-family: 'Nunito', sans-serif;
          transition: all 0.2s ease;
        }
        .auth-input-element:focus {
          border-color: #1E40AF;
          box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.15);
        }
        .auth-input-element::placeholder {
          color: #2D3748;
        }

        /* Password toggle trigger */
        .auth-password-toggle {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: #4A5568;
          cursor: pointer;
          padding: 0;
          display: grid;
          place-items: center;
          transition: color 0.15s ease;
        }
        .auth-password-toggle:hover {
          color: #718096;
        }
        .auth-password-toggle svg {
          width: 15px;
          height: 15px;
          stroke: currentColor;
          fill: none;
        }

        /* Submit Button */
        .auth-submit-btn {
          width: 100%;
          background: #173FE6;
          border: none;
          border-radius: 10px;
          padding: 12px;
          color: #FFFFFF;
          font-family: 'Nunito', sans-serif;
          font-size: 13.5px;
          font-weight: 800;
          letter-spacing: 0.06em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14 rgba(23, 63, 230, 0.15);
          margin-top: 6px;
        }
        .auth-submit-btn:hover:not(:disabled) {
          background: #254DEC;
          box-shadow: 0 6px 20px rgba(23, 63, 230, 0.35);
        }
        .auth-submit-btn.admin-red-btn {
          background: #850B0B;
          box-shadow: 0 4px 14px rgba(133, 11, 11, 0.25);
        }
        .auth-submit-btn.admin-red-btn:hover:not(:disabled) {
          background: #990F0F;
          box-shadow: 0 6px 20px rgba(153, 15, 15, 0.45);
        }
        .auth-submit-btn:active:not(:disabled) {
          transform: translateY(1px);
        }
        .auth-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Secondary actions link */
        .auth-switch-tip {
          margin-top: 18px;
          text-align: center;
          font-size: 12.5px;
          color: #4A5568;
        }
        .auth-link-trigger {
          background: transparent;
          border: none;
          color: #173FE6;
          font-weight: 700;
          font-family: 'Nunito', sans-serif;
          cursor: pointer;
          padding: 0;
          transition: color 0.15s ease;
        }
        .auth-link-trigger:hover {
          color: #254DEC;
          text-decoration: underline;
        }
        .auth-link-trigger.admin-red-link {
          color: #EF4444;
        }
        .auth-link-trigger.admin-red-link:hover {
          color: #F87171;
        }

        /* Spinner */
        .auth-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.15);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
