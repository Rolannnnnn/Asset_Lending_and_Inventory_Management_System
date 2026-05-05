import React, { useState, useEffect } from 'react';
import './admin_dashboard.css';
import LiveClock from '../tool_modules/live_clock';

import backgroundImage from '../assets/osas_white_background.png';

export function AdminDashboard({ name = "Admin", id, handleLogout }) {
  const [activeView, setActiveView] = useState('Dashboard');
  const [notifications, setNotifications] = useState([]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard' },
    { id: 'Items', label: 'Overall Items' },
    { id: 'Transactions', label: 'Transactions' },
    { id: 'Notifications', label: 'Notifications' },
    { id: 'Users', label: 'Employee' },
    { id: 'Students', label: 'Students' },
    { id: 'About', label: 'About' },
  ];

  const refreshNotifs = async () => {
    if (!id) return;
    try {
      // Replace with your actual API endpoint
      // const res = await fetch(`${CONFIG.api}/notifications/${id}`);
      // const data = await res.json();
      // setNotifications(data || []);
    } catch (err) {
      console.error("Notification sync error:", err);
    }
  };

  useEffect(() => {
    refreshNotifs();
  }, [id]);

  // 3. Dynamic Content Switcher
  const renderContent = () => {
    switch (activeView) {
      case 'Dashboard':
        return <div className="placeholder-card">Welcome to the Overview, {name}.</div>;
      case 'Items':
        return <div className="placeholder-card">Inventory Table Component Here</div>;
      case 'Notifications':
        return <div className="placeholder-card">Notifications List Component Here</div>;
      default:
        return <div className="placeholder-card">Select a view from the sidebar.</div>;
    }
  };

  return (
    <div className="inventory-admin-layout">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">DI</div>
          <span>OSAS Digital Inventory</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-link ${activeView === item.id ? 'active' : ''}`}
              onClick={() => setActiveView(item.id)}
            >
              <span className="nav-label">{item.label}</span>
              {/* Added logic for unread badge */}
              {item.id === 'Notifications' && unreadCount > 0 && (
                <span className="sidebar-unread-badge">({unreadCount})</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-link signout-btn" onClick={() => window.location.reload()}>
            <span>Sign Out</span>
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
        <header className="admin-header">
          <h1 className="admin-header-title">Admin Dashboard</h1>
          <LiveClock className="admin-header-subtitle" />
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