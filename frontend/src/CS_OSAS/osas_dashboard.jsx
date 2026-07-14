import React, { useState, useEffect } from 'react';
import './osas_dashboard.css';

import '../css_formats/header.css';
import '../css_formats/sidebar.css';
import '../css_formats/body_and_container.css';

/*import  CONFIG  from '../tool_modules/FETCH_IP.json';*/
import CONFIG from '../tool_modules/config.js';

import LiveClock from '../tool_modules/live_clock';

import backgroundImage from '../assets/osas_white_background.png';

import osasIcon from '../assets/OSAS_logo.svg';

import { OsasDashboardOverview } from './osas_tool_modules/osas_dashboard_overview';
import { OsasBorrowRequest } from './osas_tool_modules/osas_borrow_request';
import { OsasOverallItemsOverview } from './osas_tool_modules/osas_overall_items_overview';
import { OsasTransactionView } from './osas_tool_modules/sas_transaction_view';
import { AboutSystemVersion } from '../tool_modules/versions.jsx';
import { OsasStudents } from './osas_tool_modules/sas_student';
import { SASCourse } from './osas_tool_modules/sas_course';
import { OsasNotificationOverview } from './osas_tool_modules/osas_notif.jsx';
import { SasTransactionOnly } from './osas_tool_modules/sas_tabs_only.jsx';

const API_BASE = `${CONFIG.ip}:${CONFIG.port}`;

export function OsasDashboard({ user, handleLogout }) {
  const [activeView, setActiveView] = useState('Dashboard');  
  const [notifications, setNotifications] = useState([]);


  const [transactionTabFilter, setTransactionTabFilter] = useState('ALL');
  
   const [refreshCounter, setRefreshCounter] = useState(0);


    useEffect(() => {
      const fetchSidebarNotifications = async () => {
        try {
          const response = await fetch(`${API_BASE}/notifications/get/`, {
            method: "GET",
            credentials: "include",
          });
          
          if (response.ok) {
            const data = await response.json();
            setNotifications(data.notifications || []);
          }
        } catch (err) {
          console.error("Failed to fetch notifications for sidebar:", err);
        }
      };
  
      // Run this whenever the activeView changes, so the count updates
      // after the user leaves the Notifications tab
      fetchSidebarNotifications();
      const interval = setInterval(fetchSidebarNotifications, 2000);
    return () => clearInterval(interval);
    }, [activeView]);
  
    const unreadCount = notifications.filter(n => !n.is_read).length;

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard' },
    { id: 'Requests', label: 'Request Item' },
    { id: 'Transactions', label: 'All Transactions' },
    { id: 'SAS Transactions', label: 'SAS Transactions' },
    { id: 'Notifications', label: 'Notifications' },
    { id: 'Students', label: 'Students' },
    { id: 'Courses', label: 'Courses' },
    { id: 'About', label: 'About' },
  ];

  const handleDashboardNavigation = (viewName, tabFilter) => {
    if (viewName === 'TransactionView') {
      setTransactionTabFilter(tabFilter); // Cache filter selection
      setActiveView('TransactionView');   // Perform active view redirect switch
    }
  };

  // 3. Helper function to render the correct component based on activeView
  const renderView = () => {
    switch (activeView) {
        case 'Dashboard':
            return <OsasDashboardOverview user={user} handleLogout={handleLogout} />;
        case 'Requests':
            return <OsasBorrowRequest user={user} handleLogout={handleLogout} />;
        case 'Transactions':
            return <OsasTransactionView user={user} handleLogout={handleLogout} initialTab={transactionTabFilter}/>;
        case 'SAS Transactions':
            return <SasTransactionOnly user={user} handleLogout={handleLogout} />;
        case 'Notifications':
            return <OsasNotificationOverview/>;
        case 'About':
            return <AboutSystemVersion />;
        case 'Students':
            return <OsasStudents user={user} handleLogout={handleLogout} />;
        case 'Courses':
            return <SASCourse user={user} handleLogout={handleLogout} />;
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
        <span className="sidebar-logo-text">SAS Digital Inventory</span>
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
              onClick={() => {
                // If the user selects the transaction log via sidebar, reset default parameter filters
                if (item.id === 'TransactionView') {
                  setTransactionTabFilter('ALL');
                }
                setActiveView(item.id);
              }}
            >
              <span className="nav-label">
                {/* Dynamically append (4) to the Notifications label if there are unread items */}
                {item.id === 'Notifications' && unreadCount > 0 
                  ? `${item.label} (${unreadCount})` 
                  : item.label}
              </span>
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
        <div className="header-left">
          <h1 className="header-title">{user.role} Dashboard</h1>
        </div>
        <div className="header-subtitle">
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

