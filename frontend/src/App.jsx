import { useState, useEffect } from 'react';
import './App.css';

import mainLogo from './assets/OSAS_logo.svg';
import loginBackground from './assets/osas_earist_bg.png';

import visibilityIcon from './assets/pass_visibility.svg';
import visibilityOffIcon from './assets/pass_visibility_off.svg';
import fbIcon from './assets/facebook_icon.svg';

import { AdminDashboard } from './CS_ADMIN/admin_dashboard.jsx';
import { PmsDashboard } from './CS_PMS/pms_dashboard.jsx';
import { OsasDashboard } from './CS_OSAS/osas_dashboard.jsx';

import { LoadingPage } from './tool_modules/loading_page.jsx';
import { ErrorMessage } from './tool_modules/error_message.jsx';


import CONFIG from './tool_modules/config.js';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [errorModal, setErrorModal] = useState({ isOpen: false, subject: "", message: "" });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/accounts/me/`, {
          credentials: 'include'
        });
        const data = await response.json();
        if (data.account) setUser(data.account);
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      }
    };
    checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${CONFIG.ip}:${CONFIG.port}/accounts/logout/`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error("Logout API failed:", error);
    } finally {
      setUser(null);
      setUsername('');
      setPassword('');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/accounts/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      const data = await response.json();

      setTimeout(() => {
        if (response.ok) {
          setUser(data.account);
        } else {
          setUsername('');
          setPassword('');
          setErrorModal({
            isOpen: true,
            subject: data.detail?.subject || "Login Failed",
            message: data.detail?.message || "Invalid credentials."
          });
        }
        setLoading(false); 
      }, 1000);

    } catch (error) {
      setLoading(false);
      setErrorModal({ isOpen: true, subject: "Error", message: "Connection failed." });
    }
  };

  if (loading) return <LoadingPage />;

  if (user) {
    switch (user.role?.toLowerCase()) {
      case 'admin':
        return <AdminDashboard user={user} handleLogout={handleLogout} />;
      case 'pms':
        return <PmsDashboard user={user} handleLogout={handleLogout} />;
      case 'sas':
        return <OsasDashboard user={user} handleLogout={handleLogout} />;
      default:
        return (
          <div className="error-screen">
            <p>Error: Role not recognized.</p>
            <button onClick={handleLogout}>Back to Login</button>
          </div>
        );
    }
  }

  return (
    <div className="main-body-content" style={{ backgroundImage: `url(${loginBackground})` }}>
      <div className="header">
        <img src={mainLogo} className="logo" alt="OSAS logo" />
      </div>

      <div className="header-text">
        <h1>OSAS Digital Inventory</h1>
      </div>

      <form className="card" onSubmit={handleLogin}>
        <div className="text-box">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="text-box password-container">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="visibility-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            <img
              src={showPassword ? visibilityOffIcon : visibilityIcon}
              alt="toggle"
            />
          </button>
        </div>

        <button type="submit" className="login-btn">Log In</button>

        <button
          type="button"
          className="cancel-login-btn"
          style={{ marginTop: '10px', background: 'transparent', color: 'gray', padding: '14px' }}
          onClick={() => {
            setUsername('');
            setPassword('');
          }}
        >
          Cancel
        </button>
      </form>

      <footer className="footer-layout">
        <div className="read-the-docs">
          For questions and comments, contact us at:{' '}
          <a href="https://www.facebook.com/EARIST.OSAS" target="_blank" rel="noreferrer">
            <img src={fbIcon} className="footer-icons" alt="Facebook" />
          </a>
        </div>
      </footer>

      {errorModal.isOpen && (
        <ErrorMessage
          subject={errorModal.subject}
          message={errorModal.message}
          onReturn={() => setErrorModal({ ...errorModal, isOpen: false })}
          onConfirm={() => setErrorModal({ ...errorModal, isOpen: false })}
        />
      )}

    </div>
  );


}

export default App;