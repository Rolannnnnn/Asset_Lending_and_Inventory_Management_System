import React, { useState, useEffect } from 'react';
import './pms_dashboard.css';

import '../css_formats/header.css';
import '../css_formats/sidebar.css';
import '../css_formats/body_and_container.css';

import LiveClock from '../tool_modules/live_clock';

import backgroundImage from '../assets/osas_white_background.png';

import pmsIcon from '../assets/pms_icon.svg';

import { DashboardOverview } from './pms_tool_modules/pms_dashboard_overview.jsx';
import { PmsOverallItemsOverview } from './pms_tool_modules/pms_overall_items_overview.jsx';
import { PMSTransactions } from './pms_tool_modules/pms_transactions.jsx';
import { AboutSystemVersion } from '../tool_modules/versions.jsx';

export function PmsDashboard({ user, handleLogout }) {
  const [activeView, setActiveView] = useState('Dashboard');
  const [notifications] = useState([]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard' },
    { id: 'Transactions', label: 'Transactions' },
    { id: 'Inventory', label: 'Inventory' },
    { id: 'About', label: 'About' },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'Dashboard':
        return <DashboardOverview user={user} handleLogout={handleLogout} />
      case 'Inventory':
        return <PmsOverallItemsOverview user={user} handleLogout={handleLogout} />;
      case 'Transactions':
        return <PMSTransactions user={user} handleLogout={handleLogout} />
      case 'About':
        return <AboutSystemVersion />;
      default:
        return <div className="card-container">Select a view from the sidebar.</div>;
    }
  };

  return (
    <div className="inventory-whole-screen-layout">
      {/* SIDEBAR */}
      <div className="sidebar">

        <div className="sidebar-logo">
          <img className="sidebar-logo-img" src={pmsIcon} alt="PMS Icon" />
          <span className="sidebar-logo-text">OSAS Digital Inventory</span>
        </div>

        <div className="sidebar-greetings" style={{ textAlign: 'center' }}>
          <span style={{ textTransform: 'capitalize' }}>
            Welcome, {user?.username || 'pms'}
          </span>
          <br></br>
          <span style={{ textTransform: 'capitalize' }}>
            Role: {user?.role || 'pms'}
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
          <button className="signout-btn1" onClick={handleLogout}>
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