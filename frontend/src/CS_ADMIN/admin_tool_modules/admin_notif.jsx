import React, { useState, useEffect, useRef } from 'react';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import '../../css_formats/global_body.css';

import refreshIcon from '../../assets/refresh_icon.svg'; 
import markAllNotifAsRead from '../../assets/mark_all_read_icon.svg';

const API_BASE = `${CONFIG.ip}:${CONFIG.port}`;

const getStatusClass = (status) => status?.toLowerCase()?.replace('_', '-') || 'default';
const formatStatus = (status) => status?.toUpperCase()?.replace('_', ' ') || 'UNKNOWN';

function renderModalTabs({ role, selectedItem, modalTab, setModalTab, allTickets }) {
    return (
        <div className="modal-tabs-wrapper">
            <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #cbd5e1', marginBottom: '10px' }}>
                <button className={`tab-btn ${modalTab === 'updates' ? 'active' : ''}`} onClick={() => setModalTab('updates')}>Overview</button>
            </div>
            {modalTab === 'updates' && (
                <div className="tab-content-pane">
                    <div style={{ padding: '8px' }}>
                        <p style={{ margin: '4px 0', color: '#475569', fontSize: '0.9rem' }}>
                            Notification metrics trace logged successfully. System synchronization step verified.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export function AdminNotificationOverview({ role, id, refreshNotifs }) {
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [selectedNotif, setSelectedNotif] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [modalTab, setModalTab] = useState('updates');
    const [allTickets, setAllTickets] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [stats, setStats] = useState({ total: 0, completed: 0, done: 0, in_prog: 0, to_do: 0, byCategory: {} });
    const [errorModal, setErrorModal] = useState({ isOpen: false, subject: '', message: '' });
    const closeErrorModal = () => setErrorModal({ ...errorModal, isOpen: false });

    const hasLoadedInitial = useRef(false);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    // Aligned with get_all_via_account_id backend logic
    const fetchNotifications = async (manual = false) => {
        if (manual) setIsRefreshing(true);
        else setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/notifications/get/`, {
                method: "GET",
                credentials: "include",
            });

            const data = await response.json();
            if (response.ok) {
                // The backend returns an array of ParsedNotification dataclasses
                // which nests the notification details inside n.notification and the string inside n.content
                const incoming = data.notifications || [];
                const sorted = incoming.sort((a, b) => new Date(b.notification?.date) - new Date(a.notification?.date));

                if (!hasLoadedInitial.current || manual) {
                    setNotifications(sorted);
                    hasLoadedInitial.current = true;
                }
            } else {
                setErrorModal({ 
                    isOpen: true, 
                    subject: data.detail?.subject || `Error ${response.status}`, 
                    message: data.detail?.message || data.detail || "Failed to fetch notifications." 
                });
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setErrorModal({ 
                isOpen: true, 
                subject: "Connection Error", 
                message: "Check your network or server status." 
            });
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const res = await fetch(`${API_BASE}/tickets/get_ticket/`, {
                    method: "GET", 
                    credentials: "include"
                });
                const data = await res.json();
                if (res.ok) {
                    setAllTickets(data.ticket || []);
                } else {
                    setErrorModal({ 
                        isOpen: true, 
                        subject: data.detail?.subject || "Error", 
                        message: data.detail?.message || "Failed to fetch tickets." 
                    });
                }
            } catch (err) {
                console.error(err);
                setErrorModal({ 
                    isOpen: true, 
                    subject: "Connection Error", 
                    message: "Check your network or server status." 
                });
            }
        };
        if (role === 'admin') {
            fetchAll();
            getDashboardStats();
        }
    }, [role]);

    // Interacts with read_unread_one (to_read = True)
    const markAsRead = async (notifId) => {
        setNotifications(prev => prev.map(n => n.notification?.id === notifId ? { ...n, notification: { ...n.notification, is_read: true } } : n));
        try {
            await fetch(`${API_BASE}/notifications/read_one/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notification_id: notifId }),
                credentials: "include",
            });
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    // Interacts with read_all backend function
    const markAllAsRead = async () => {
        if (!window.confirm("Mark all notifications as read?")) return;
        try {
            const response = await fetch(`${API_BASE}/notifications/read_all/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });
            if (response.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, notification: { ...n.notification, is_read: true } })));
            } else {
                setErrorModal({ isOpen: true, subject: "Error", message: "Failed to mark all notifications as read." });
            }
        } catch (err) {
            console.error("Failed to mark all as read:", err);
            setErrorModal({ isOpen: true, subject: "Connection Error", message: "Check your network or server status." });
        }
    };

    // Interacts with read_unread_one (to_read = False)
    const toggleToUnread = async (notifId) => {
        try {
            const response = await fetch(`${API_BASE}/notifications/unread_one/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notification_id: notifId }),
                credentials: "include",
            });

            if (response.ok) {
                setNotifications(prev => prev.map(n => n.notification?.id === notifId ? { ...n, notification: { ...n.notification, is_read: false } } : n));
                setSelectedNotif(null);
            } else {
                setErrorModal({ isOpen: true, subject: "Error", message: "Failed to mark notification as unread." });
            }
        } catch (err) {
            console.error("Network error toggling status:", err);
            setErrorModal({ isOpen: true, subject: "Connection Error", message: "Check your network or server status." });
        }
    };

    const getDashboardStats = async () => {
        try {
            const response = await fetch(`${API_BASE}/tickets/get_ticket/`, {
                method: "GET",
                credentials: "include",
            });
            const data = await response.json();

            if (response.ok && data.ticket) {
                const tickets = data.ticket;
                const categoryCounts = tickets.reduce((acc, t) => {
                    const catName = t.category || "Unassigned";
                    acc[catName] = (acc[acc] || 0) + 1;
                    return acc;
                }, {});

                setStats({
                    total: tickets.length,
                    completed: tickets.filter(t => t.status?.toLowerCase() === 'completed').length,
                    done: tickets.filter(t => t.status?.toLowerCase() === 'done').length,
                    in_prog: tickets.filter(t => t.status?.toLowerCase() === 'in_progress').length,
                    to_do: tickets.filter(t => t.status?.toLowerCase() === 'to_do').length,
                    byCategory: categoryCounts
                });
            } else {
                setErrorModal({ isOpen: true, subject: data.detail?.subject || "Error", message: data.detail?.message || "Failed to fetch tickets." });
            }
        } catch (err) {
            console.error(err);
            setErrorModal({ isOpen: true, subject: "Connection Error", message: "Check your network or server status." });
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (item) => {
        setSelectedNotif(item);
        setModalTab('updates');

        if (!item.notification?.is_read) {
            markAsRead(item.notification.id);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const filteredNotifs = notifications.filter(n => {
        const searchLower = searchTerm.toLowerCase().trim();
        const matchesSearch =
            (n.content || "").toLowerCase().includes(searchLower) ||
            String(n.notification?.transaction_id || "").includes(searchLower);

        const matchesTab =
            activeTab === 'all' ||
            (activeTab === 'unread' && !n.notification?.is_read) ||
            (activeTab === 'read' && n.notification?.is_read);

        if (searchLower !== '') {
            return matchesSearch;
        }
        return matchesTab;
    });

    return (
        <section className="detail-view-container">
            <div className="detail-view-header">
                <div className="body-header-font3" style={{ border: 'none', padding: 0 }}>
                    Notification Overview {unreadCount > 0 && `(${unreadCount} New)`}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="reopen-btn"
                        onClick={() => fetchNotifications(true)}
                        disabled={isRefreshing}
                        style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <img
                            src={refreshIcon}
                            alt="refresh"
                            className={isRefreshing ? "spin-animation" : ""}
                            style={{ width: '16px', height: '16px' }}
                        />
                        {isRefreshing ? "Updating" : "Refresh"}
                    </button>

                    {notifications.some(n => !n.notification?.is_read) && (
                        <button
                            className="review-btn"
                            onClick={markAllAsRead}
                            style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <img
                                src={markAllNotifAsRead}
                                alt="mark read"
                                style={{ width: '16px', height: '16px' }}
                            />
                            Mark all as read
                        </button>
                    )}
                </div>
            </div>

            <div className="tabs-container" style={{ marginTop: '20px' }}>
                {['all', 'unread', 'read'].map(tab => (
                    <div
                        key={tab}
                        className={`tab-item ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        <span className="tab-count">
                            ({tab === 'all' ? notifications.length :
                                notifications.filter(n => tab === 'unread' ? !n.notification?.is_read : n.notification?.is_read).length})
                        </span>
                    </div>
                ))}
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search Transaction ID"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="ticket-list-wrapper" style={{ borderRadius: '0 0 8px 8px', borderTop: 'none' }}>
                {loading && !isRefreshing ? (
                    <p style={{ padding: '20px' }}>Loading notifications...</p>
                ) : filteredNotifs.length > 0 ? (
                    <table className="overview-table">
                        <thead>
                            <tr>
                                <th>Notification</th>
                                <th>Date</th>
                                <th style={{ textAlign: 'center' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredNotifs.map((n) => (
                                <tr
                                    key={n.notification?.id}
                                    className="clickable-row"
                                    onClick={() => handleRowClick(n)}
                                    style={{ backgroundColor: n.notification?.is_read ? 'transparent' : '#00ff9521' }}
                                >
                                    <td style={{ maxWidth: '400px' }}>
                                        <div style={{ fontWeight: n.notification?.is_read ? 'normal' : '600', color: '#2c3e50' }}>{n.content}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#024f3e', marginTop: '4px' }}>Transaction ID: #{n.notification?.transaction_id}</div>
                                    </td>
                                    <td>{n.notification?.date ? new Date(n.notification.date).toLocaleDateString() : 'N/A'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div className={`status-pill ${n.notification?.is_read ? 'completed' : 'to-do'}`}>
                                            {n.notification?.is_read ? 'Read' : 'Unread'}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p style={{ padding: '40px', textAlign: 'center', color: '#999' }}>No {activeTab} notifications found.</p>
                )}
            </div>

            {errorModal.isOpen && (
                <div className="modal-overlay" onClick={closeErrorModal} style={{ zIndex: 3000 }}>
                    <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', borderTop: '4px solid #ef4444' }}>
                        <div className="modal-header">
                            <h3 style={{ color: '#b91c1c', margin: 0 }}>{errorModal.subject}</h3>
                        </div>
                        <div className="modal-body"><p>{errorModal.message}</p></div>
                        <div className="modal-footer">
                            <button className="cancel-btn" onClick={closeErrorModal}>OK</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedNotif && (
                <div className="modal-overlay" onClick={() => setSelectedNotif(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="body-header-font3" style={{ border: 'none', padding: 0 }}>Notification Details</h2>
                            <button className="close-btn" onClick={() => setSelectedNotif(null)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="info-meta">
                                <p><strong>Transaction Reference:</strong> #{selectedNotif.notification?.transaction_id}</p>
                                <p><strong>Category:</strong> <span className={`status-pill ${selectedNotif.notification?.mode?.toLowerCase() || 'default'}`}>{selectedNotif.notification?.mode?.replace('_', ' ') || 'GENERAL'}</span></p>
                                <p><strong>Received:</strong> {selectedNotif.notification?.date ? new Date(selectedNotif.notification.date).toLocaleString() : 'N/A'}</p>
                            </div>
                            <div className="description-body">
                                <label className="body-content-text" style={{ fontWeight: 700 }}>Message:</label>
                                <p style={{ marginTop: '8px', color: '#2c3e50' }}>{selectedNotif.content}</p>
                            </div>
                            <div className="description-body" style={{ marginTop: '24px' }}>
                                {renderModalTabs({
                                    role,
                                    selectedItem: selectedNotif,
                                    modalTab,
                                    setModalTab,
                                    allTickets: allTickets || [],
                                    getStatusClass,
                                    formatStatus
                                })}
                            </div>
                        </div>

                        <div style={{ textAlign: 'right', padding: '18px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            {selectedNotif.notification?.is_read && (
                                <button
                                    className="update-btn"
                                    onClick={() => toggleToUnread(selectedNotif.notification.id)}
                                >
                                    Mark as Unread
                                </button>
                            )}
                            <button className="update-btn" onClick={() => setSelectedNotif(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}