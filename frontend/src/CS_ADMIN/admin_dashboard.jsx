import React, { useState, useEffect } from 'react';
import './admin_dashboard.css';

import '../css_formats/header.css';
import '../css_formats/sidebar.css';
import '../css_formats/body_and_container.css';
import '../css_formats/global_body.css';

/*import CONFIG from '../tool_modules/FETCH_IP.json';*/
import CONFIG from '../tool_modules/config.js';

import LiveClock from '../tool_modules/live_clock';

import backgroundImage from '../assets/osas_white_background.png';

import adminIcon from '../assets/OSAS_logo.svg';
import addPersonIcon from '../assets/add_person_icon.svg';

import { AdminEmployee, EmployeeTable, AdminEditEmployee } from './admin_tool_modules/admin_employee.jsx';
import { AdminNotificationOverview } from './admin_tool_modules/admin_notif.jsx';
import { AdminStudents } from './admin_tool_modules/admin_students.jsx';
import { AdminOverallItemsOverview } from './admin_tool_modules/admin_overall_items.jsx';
import { AdminTransactionView } from './admin_tool_modules/admin_transaction_view.jsx';
import { AdminDashboardOverview } from './admin_tool_modules/admin_dashboard_overview.jsx';
import { AdminCourse } from './admin_tool_modules/admin_course.jsx';
import { AboutSystemVersion } from '../tool_modules/versions.jsx';

const API_BASE = `${CONFIG.ip}:${CONFIG.port}`;

export function AdminDashboard({ user, handleLogout }) {
  const [activeView, setActiveView] = useState('Dashboard');
  const [notifications, setNotifications] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeLists, setEmployeeLists] = useState([]);
  
  // Custom routing helper state for passing parameters between cross-linked views
  const [transactionTabFilter, setTransactionTabFilter] = useState('ALL');
  
  const [refreshCounter, setRefreshCounter] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');

const filteredEmployees = employeeLists.filter((employee) => {
    const searchLower = searchTerm.toLowerCase();
    return employee.name?.toLowerCase().includes(searchLower) || 
           employee.username?.toLowerCase().includes(searchLower);
});

  // Fetch notifications to populate the sidebar badge
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

  useEffect(() => {
    const fetchAllEmployees = async () => {
        try {
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/accounts/get_all/`, {
                method: "GET",
                credentials: "include"
            });
            const data = await response.json();
            if (response.ok) {
                setEmployeeLists(data.accounts || []);
            }
        } catch (err) {
            console.error("Fetch failed", err);
        }
    };
    fetchAllEmployees();
}, [refreshCounter]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard' },
    { id: 'Items', label: 'Overall Items' },
    { id: 'TransactionView', label: 'Transaction View' },
    { id: 'Notifications', label: 'Notifications' },
    { id: 'Users', label: 'Employee' },
    { id: 'Students', label: 'Students' },
    { id: 'Courses', label: 'Courses' },
    { id: 'About', label: 'About' },
  ];

  // Global navigation handler passed down to nested dashboard components
  const handleDashboardNavigation = (viewName, tabFilter) => {
    if (viewName === 'TransactionView') {
      setTransactionTabFilter(tabFilter); // Cache filter selection
      setActiveView('TransactionView');   // Perform active view redirect switch
    }
  };



  const renderContent = () => {
    switch (activeView) {
      case 'Dashboard':
        return <AdminDashboardOverview onNavigate={handleDashboardNavigation} />;
      case 'Items':
        return <AdminOverallItemsOverview />;
      case 'TransactionView':
        return <AdminTransactionView initialTab={transactionTabFilter} />;
      case 'Notifications':
        return <AdminNotificationOverview/>;
      case 'Users':
        return (
          <div className="body-main-content" style={{borderRadius: '12px'}}>
          <div className="placeholder-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: '#2c3e50' }}>Staff Directory</h2>

              <div className="search-container">
                        <input
                            type="text"
                            placeholder="Search by Name or Username..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
              </div>
              
                <button
                  className="update-btn"
                  onClick={() => setShowAddModal(true)}
                >
                  <img
                    src={addPersonIcon}
                    alt="Add New Employee"
                    style={{ marginRight: '5px', width: '16px', height: '16px' }} 
                  />
                  Add New Employee
                </button>
            </div>
            
              <EmployeeTable
                employees={filteredEmployees}
                onEditClick={(emp) => setEditingEmployee(emp)}
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

            {editingEmployee && (
              <AdminEditEmployee 
                employee={editingEmployee}
                onClose={() => setEditingEmployee(null)}
                onSuccess={() => {
                  setEditingEmployee(null);
                  setRefreshCounter(prev => prev + 1); 
                }}
              />
            )}
          </div>
          </div>
        );
      case 'Students':
        return <AdminStudents />;
      case 'Courses':
        return <AdminCourse />;
      case 'About':
            return <AboutSystemVersion />;
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
          <span className="sidebar-logo-text">SAS Digital Inventory</span>
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
            <h1 className="body-header-font">{activeView === 'TransactionView' ? 'Transaction View' : activeView}</h1>
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