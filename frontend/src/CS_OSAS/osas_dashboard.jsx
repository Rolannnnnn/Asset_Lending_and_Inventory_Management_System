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
        case 'Students':
        case 'Notifications':
            return (
                <div className="card-container" style={{ textAlign: 'center', padding: '50px' }}>
                    <h3 style={{ color: '#666' }}>{activeView} Module Coming Soon</h3>
                    <p>This feature is currently being integrated into the inventory system.</p>
                </div>
            );
        default:
            return <div className="card-container">Select a view from the sidebar.</div>;
    }
};

  return (
  <div className="inventory-whole-screen-layout">
    {/* Sidebar Section */}
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img className="sidebar-logo-img" src={osasIcon} alt="OSAS Icon" />
        <span className="sidebar-logo-text">OSAS Digital Inventory</span>
      </div>

      <div className="sidebar-greetings">
        <div className="user-profile-info">
          <span className="welcome-text">Welcome, {user?.username || 'User'}</span>
          <span className="role-text">Role: {user?.role || 'Staff'}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-link ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setActiveView(item.id)}
          >
            <span className="nav-label">{item.label}</span>
            {/* Show unread notification count badge */}
            {item.id === 'Notifications' && unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="signout-btn1" onClick={handleLogout}>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>

    {/* Main Content Section */}
    <main 
      className="body-main-content"
      style={{
        /* Using a linear gradient overlay to ensure text readability over the background image */
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <header className="header-bar">
        <div className="header-left">
          <h1 className="header-title">{user.role} Portal</h1>
        </div>
        <div className="header-right">
          <LiveClock className="header-clock" />
        </div>
      </header>

      <section className="view-container">
        {/* Sub-header indicating the active module */}
        <div className="view-header-group">
          <h2 className="body-header-font">{activeView}</h2>
        </div>

        {/* This is where your component (Borrow Request, Items, etc.) is injected */}
        <div className="content-render-area">
          {renderView()}
        </div>
      </section>
    </main>
  </div>
);
}


// FIX THE WHITECSCREEN ISSUE WHEN IMPORTING STUDENTS, ALSO ADD A LOADING STATE TO THE IMPORT BUTTON
// BORROW REQUEST MODULE: ADD A LOADING STATE TO THE SUBMIT BUTTON, ALSO DISABLE THE EQUIPMENT OPTIONS THAT ARE NOT AVAILABLE FOR BORROWING (MAINTENANCE OR OUT OF STOCK)