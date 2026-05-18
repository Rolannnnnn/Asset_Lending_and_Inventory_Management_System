import React, { useState, useEffect } from 'react';
import './admin_dashboard.css';

import '../css_formats/header.css';
import '../css_formats/sidebar.css';
import '../css_formats/body_and_container.css';
import '../css_formats/global_body.css';

import LiveClock from '../tool_modules/live_clock';

import backgroundImage from '../assets/osas_white_background.png';

import adminIcon from '../assets/admin_icon.svg';
import addPersonIcon from '../assets/add_person_icon.svg';


import { AdminEmployee, EmployeeTable, AdminEditEmployee } from './admin_tool_modules/admin_employee.jsx';
import { AdminTransactions } from './admin_tool_modules/admin_transaction.jsx';
import { AdminStudents } from './admin_tool_modules/admin_students.jsx';
import { AdminOverallItemsOverview } from './admin_tool_modules/admin_overall_items.jsx';


export function AdminDashboard({ user, handleLogout }) {
  const [activeView, setActiveView] = useState('Dashboard');
  const [notifications, setNotifications] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  
  const [refreshCounter, setRefreshCounter] = useState(0);

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

  const renderContent = () => {
    switch (activeView) {
      case 'Dashboard':
        return <div className="placeholder-card">Welcome to the Overview, {user?.username || 'admin'}.</div>;
      case 'Items':
        return <AdminOverallItemsOverview />;
      case 'Transactions':
        return <AdminTransactions user={user} handleLogout={handleLogout} />;
      case 'Notifications':
        return <div className="placeholder-card">Notifications List Component Here</div>;
      case 'Users':
        return (
          <div className="body-main-content">
          <div className="placeholder-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: '#2c3e50' }}>Staff Directory</h2>
              
                <button
                  className="update-btn"
                  onClick={() => setShowAddModal(true)}
                >
                  <img
                    src={addPersonIcon}
                    alt="Add New Employee"
                    style={{ marginRight: '5px', width: '16px', height: '16px' }} // Set explicit dimensions if needed
                  />
                  Add New Employee
                </button>
            </div>
            
            {/* Pass the setEditingEmployee function to the table! */}
            <EmployeeTable 
                refreshTrigger={refreshCounter} 
                onEditClick={(employeeData) => setEditingEmployee(employeeData)} 
            />

            {showAddModal && (
              <AdminEmployee 
                onClose={() => setShowAddModal(false)}
                onSuccess={() => {
                  setShowAddModal(false);
                  setRefreshCounter(prev => prev + 1);
                }}
              />
            )}

            {/* ADDED: The Edit Modal triggers when editingEmployee is not null */}
            {editingEmployee && (
              <AdminEditEmployee 
                employee={editingEmployee}
                onClose={() => setEditingEmployee(null)}
                onSuccess={() => {
                  setEditingEmployee(null);
                  setRefreshCounter(prev => prev + 1); // Refresh the table!
                }}
              />
            )}
          </div>
          </div>
        );
      case 'Students':
        return <AdminStudents />;
      default:
        return <div className="placeholder-card">Select a view from the sidebar.</div>;
    }
  };

  return (
    <div className="inventory-whole-screen-layout">
      {/* SIDEBAR */}
      <div className="sidebar">
        
        <div className="sidebar-logo">
           <img className="sidebar-logo-img" src={adminIcon} alt="PMS Icon" />
           <span className="sidebar-logo-text">OSAS Digital Inventory</span>
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
          <h1 className="header-title">{user?.role} Dashboard</h1>
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