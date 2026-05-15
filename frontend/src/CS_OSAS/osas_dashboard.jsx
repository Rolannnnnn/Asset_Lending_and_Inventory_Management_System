import React, { useState } from 'react';
import './osas_dashboard.css';

import '../css_formats/header.css';
import '../css_formats/sidebar.css';
import '../css_formats/body_and_container.css';

import LiveClock from '../tool_modules/live_clock';

import backgroundImage from '../assets/osas_white_background.png';

import osasIcon from '../assets/osas_icon.svg';

import { OsasDashboardOverview } from './osas_tool_modules/osas_dashboard_overview';
import { OsasBorrowRequest } from './osas_tool_modules/osas_borrow_request';
import { OsasOverallItemsOverview } from './osas_tool_modules/osas_overall_items_overview';
import { OsasTransactionView } from './osas_tool_modules/sas_transaction_view';
import { AboutSystemVersion } from '../tool_modules/versions.jsx';

export function OsasDashboard({ user, handleLogout }) {
  const [activeView, setActiveView] = useState('Dashboard');  
  const [notifications, setNotifications] = useState([]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard' },
    { id: 'Requests', label: 'Request Item' },
    { id: 'Overall Items', label: 'Items' },
    { id: 'Transactions', label: 'Transactions' },
    { id: 'Students', label: 'Students' },
    { id: 'Notifications', label: 'Notifications' },
    { id: 'About', label: 'About' },
  ];

  // 3. Helper function to render the correct component based on activeView
  const renderView = () => {
    switch (activeView) {
      case 'Dashboard':
        return <OsasDashboardOverview user={user} handleLogout={handleLogout} />;
      case 'Requests':
        return <OsasBorrowRequest user={user} handleLogout={handleLogout} />;
      case 'Overall Items':
        return <OsasOverallItemsOverview user={user} handleLogout={handleLogout} />;
      case 'Transactions':
        return <OsasTransactionView user={user} handleLogout={handleLogout} />;
      case 'About':
        return <AboutSystemVersion />;
      default:
        return <div className="card-container">Select a view from the sidebar.</div>;
    }
  };

  return (
    <div className="inventory-whole-screen-layout">
      {/* Sidebar Section */}
      <div className="sidebar">

        <div className="sidebar-logo">
          <img className="sidebar-logo-img" src={osasIcon} alt="PMS Icon" />
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
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="signout-btn1" onClick={handleLogout}>
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content Section */}
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
            {renderView()}
          </div>
        </section>
      </main>
    </div>
  );
}