import React, { useState, useEffect } from 'react';
import './admin_dashboard.css';

import '../css_formats/header.css';
import '../css_formats/sidebar.css';
import '../css_formats/body_and_container.css';

import LiveClock from '../tool_modules/live_clock';

import backgroundImage from '../assets/osas_white_background.png';
import logoutIcon from '../assets/logout_icon.svg';

import adminIcon from '../assets/admin_icon.svg';

export function AdminDashboard({ user, handleLogout }) {
  const [activeView, setActiveView] = useState('Dashboard');
  const [notifications] = useState([]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard' },
    { id: 'Items', label: 'Overall Items' },
    { id: 'Notifications', label: 'Notifications' },
    { id: 'Users', label: 'Employee' },
    { id: 'Students', label: 'Students' },
    { id: 'About', label: 'About' },
  ];

  // 3. Dynamic Content Switcher
  const renderContent = () => {
    switch (activeView) {
      case 'Dashboard':
        return <div className="placeholder-card">Welcome to the Overview, {user?.username || 'admin'}.</div>;
      case 'Items':
        return <div className="placeholder-card">Inventory Table Component Here</div>;
      case 'Notifications':
        return <div className="placeholder-card">Notifications List Component Here</div>;
      default:
        return <div className="placeholder-card">Select a view from the sidebar.</div>;
    }
  };

  return (
    <div className="inventory-whole-screen-layout">
      {/* SIDEBAR */}
      <div className="sidebar">
        
        <div className="sidebar-logo" style={{ textAlign: 'left' }}>
          <img className="sidebar-logo" src={adminIcon} alt="Admin Icon" />
          OSAS Digital Inventory
        </div>

        <div className="sidebar-greetings" style={{ textAlign: 'center' }}>
          <span style={{ textTransform: 'capitalize' }}>
            Welcome, {user?.username || 'admin'}
          </span>
          <br></br>
          <span style={{ textTransform: 'capitalize' }}>
            Role: {user?.role || 'admin'}
          </span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-link ${activeView === item.id ? 'active' : ''}`}
              onClick={() => setActiveView(item.id)}
            >
              <span className="nav-label">{item.label}</span>
              {item.id === 'Notifications' && unreadCount > 0 && (
                <span className="sidebar-unread-badge">({unreadCount})</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-link signout-btn" onClick={handleLogout}>
            <img 
            src={logoutIcon} 
            alt="export" 
            style={{ width: '18px', height: '18px' }} 
          />

            Sign Out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="body-main-content"

        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '100vh'
        }}



      >
        <header className="header-bar">
          <h1 className="header-title">{user.role} Dashboard</h1>
          <LiveClock className="header-subtitle" />
        </header>

        <section className="view-container">
          <div className="view-header-group">
            <h1 className="body-header-font">{activeView}</h1>
          </div>

          {/* Dynamic Content Rendering */}
          <div className="content-render-area">
            {renderContent()}
          </div>
        </section>
      </main>
    </div>
  );
}