import React, { useState } from 'react';
import './osas_dashboard.css';

// 1. Importing sub-modules from tool modules typeshibal
import { OsasDashboardOverview } from './osas_tool_modules/osas_dashboard_overview';
import { OsasBorrowRequest } from './osas_tool_modules/osas_borrow_request';
import { OsasOverallItemsOverview } from './osas_tool_modules/osas_overall_items_overview';
import { OsasTransactionView } from './osas_tool_modules/sas_transaction_view';

export function OsasDashboard({user, handleLogout}) {
  const [activeView, setActiveView] = useState('Dashboard');

  //
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
        return <OsasDashboardOverview />;
      case 'Requests': 
        return <OsasBorrowRequest />;
      case 'Overall Items':
        return <OsasOverallItemsOverview />;
      case 'Transactions':
        return <OsasTransactionView />;
      default:
        return (
          <div className="placeholder-card">
            <p className="body-content-text">
              Showing content for <strong>{activeView}</strong>.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="inventory-osas-layout">
      {/* Sidebar Section */}
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
          <button className="nav-link signout-btn" onClick={handleLogout}>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Section */}
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
          </div>
        </header>

        <section className="view-container">
          <h1 className="body-header-font">{activeView}</h1>
          <hr className="header-divider" />
          
          {/* 4. Dynamic content area where sub-components are displayed */}
          <div className="dynamic-content">
            {renderView()}
          </div>
        </section>
      </main>
    </div>
  );
}