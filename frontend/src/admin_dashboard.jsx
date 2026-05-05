import React, { useState } from 'react';
// Assuming you are using lucide-react for icons based on your code style
import { 
  LayoutDashboard, 
  Bell, 
  Package, 
  History, 
  Users, 
  Info, 
  LogOut, 
  Search 
} from 'lucide-react'; 

import './admin_dashboard.css';

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState('Dashboard');

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'Overall Items', label: 'Overall Items', icon: <Package size={20} /> },
    { id: 'Transactions', label: 'Transactions', icon: <History size={20} /> },
    { id: 'Notifications', label: 'Notifications', icon: <Bell size={20} /> },
    { id: 'Employee', label: 'Users', icon: <Users size={20} /> },
    { id: 'About', label: 'About', icon: <Info size={20} /> },
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
              {item.icon}
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {/* Added a real click handler for Logout if needed */}
          <button className="nav-link signout-btn" onClick={() => window.location.reload()}>
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
              Showing content for <strong>{activeView}</strong>.
            </p>
            {/* This is where you will eventually call your sub-components */}
          </div>
        </section>
      </main>
    </div>
  );
}