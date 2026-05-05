import React, { useState } from 'react'
import './pms_dashboard.css';

export default function PmsDashboard() {
  const [activeView, setActiveView] = useState('Dashboard');

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard' },
    { id: 'Overall Items', label: 'Items' },
    { id: 'Transactions', label: 'Transactions' },
    { id: 'Notifications', label: 'Notifications' },
    { id: 'Employee', label: 'Users' },
    { id: 'About', label: 'About' },
  ];
  return (
    <div className="inventory-pms-layout">
      <aside className="sidebar">
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
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {/* click handler for Logout*/}
          <button className="nav-link signout-btn" onClick={() => window.location.reload()}>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          {activeView !== 'Dashboard' ? (
            <div className="header-search">
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#888' }}>SEARCH</span>
              <input type="text" placeholder={`Search ${activeView}...`} />
            </div>
          ) : (
            <div className="header-spacer"></div>
          )}
          <div className="header-profile">
            <button className="text-link">Personnel</button>
            <div className="profile-info">  
            </div>
          </div>
        </header>

        <section className="view-container">
          <h1 className="body-header-font">{activeView}</h1>
          <hr className="header-divider" />

          <div className="placeholder-card">
            <p className="body-content-text">
              Showing content for <strong>{activeView}</strong>.
            </p>
            {/* This is where you will eventually call your sub-components */}
          </div>
        </section>
      </main>
    </div>
  );
}