// admin placeholder for the meantime


import React, { useState } from 'react';
import { 
  Dashboard,
  Notification,
  Items,
  Transactions, 
  Users, 
  About, 
  LogOut,  
} from 'lucide-react';
import './admin_dashboard.css';

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState('Dashboard');

  // Placeholder
  const navItems = [
    { id: 'Dashboard', label: 'Dashboard' },
    { id: 'Overall Items', label: 'Overall Items' }, //subject to change since meron pang stocks and sht
    { id: 'Transactions', label: 'Transactions' },// transaction events
    { id: 'Notifications', label: 'Notifications' },// for each transaction 
    { id: 'Employee', label: 'Users'},// as usual
    { id: 'About', label: 'About' },// kami i2 
  ];

  return (
    <div className="inventory-admin-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">DI</div>
          <span>Digital Inventory</span>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-link ${activeView === item.id ? 'active' : ''}`}
              onClick={() => setActiveView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-link signout-btn">
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <div className="header-search">
            <Search size={18} />
            <input type="text" placeholder="Search assets, IDs, or employees..." />
          </div>
          <div className="header-profile">
            <Bell size={20} className="header-icon" />
            <div className="profile-info">
              <span className="profile-name">Klip</span>
              <span className="profile-role">Administrator</span>
            </div>
            <div className="profile-avatar">K</div>
          </div>
        </header>

        <section className="view-container">
          <h1 className="body-header-font">{activeView}</h1>
          <hr className="header-divider" />
          
          <div className="placeholder-card">
            <p className="body-content-text">
              Showing content for <strong>{activeView}</strong>. t.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}