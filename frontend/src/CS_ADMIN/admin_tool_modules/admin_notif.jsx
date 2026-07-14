import React, { useState, useEffect, useRef } from 'react';
import { ErrorMessage } from '../../tool_modules/error_message.jsx';
/*import CONFIG from '../../tool_modules/FETCH_IP.json';*/
import CONFIG from '../../tool_modules/config.js';
import '../../css_formats/global_body.css';

import refreshIcon from '../../assets/refresh_icon.svg';
import markAllNotifAsRead from '../../assets/mark_all_read_icon.svg';

const API_BASE = `${CONFIG.ip}:${CONFIG.port}`;

const getStatusClass = (status) => status?.toLowerCase()?.replace('_', '-') || 'default';
const formatStatus = (status) => status?.toUpperCase()?.replace('_', ' ') || 'UNKNOWN';

export function AdminNotificationOverview({ role, id, refreshNotifs }) {
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [selectedNotif, setSelectedNotif] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [markAllConfirmModal, setMarkAllConfirmModal] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [modalTab, setModalTab] = useState('updates');
    const [allTickets, setAllTickets] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [stats, setStats] = useState({ total: 0, completed: 0, done: 0, in_prog: 0, to_do: 0, byCategory: {} });
    const [errorModal, setErrorModal] = useState({ isOpen: false, subject: '', message: '' });
    const closeErrorModal = () => setErrorModal({ ...errorModal, isOpen: false });

    const hasLoadedInitial = useRef(false);
    
    const unreadCount = notifications.filter(n => !n.is_read).length;

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
                const incoming = data.notifications || [];
                const sorted = incoming.sort((a, b) => new Date(b.date) - new Date(a.date));

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
        const interval = setInterval(() => {
            fetchNotifications(false);
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchAllAndStats = async () => {
            try {
                const res = await fetch(`${API_BASE}/tickets/get_ticket/`, {
                    method: "GET",
                    credentials: "include"
                });
                const data = await res.json();
                
                if (res.ok) {
                    const tickets = data.ticket || [];
                    setAllTickets(tickets);

                    const categoryCounts = tickets.reduce((acc, t) => {
                        const catName = t.category || "Unassigned";
                        acc[catName] = (acc[catName] || 0) + 1;
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
            fetchAllAndStats();
        }
    }, [role]);

    const markAsRead = async (notifId) => {
        // === DEBUG LOGS ===
        console.log("DEBUG [markAsRead]: notifId passed in is:", notifId);
        
        const payload = { notification_id: Number(notifId) };
        console.log("DEBUG [markAsRead]: Payload being sent to FastAPI:", JSON.stringify(payload));

        setNotifications(prev => prev.map(n =>
            n.id == notifId
                ? { ...n, is_read: true }
                : n
        ));

        try {
            const response = await fetch(`${API_BASE}/notifications/read_one/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                credentials: "include",
            });
            
            if (!response.ok) {
                const errData = await response.json();
                // === DEBUG LOGS ===
                console.error("DEBUG [markAsRead]: FastAPI returned error!", errData);
                
                // Revert the UI state because it failed!
                setNotifications(prev => prev.map(n =>
                    n.id == notifId ? { ...n, is_read: false } : n
                ));
            } else {
                console.log("DEBUG [markAsRead]: Successfully marked as read on server!");
            }
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    const toggleToUnread = async (notifId) => {
        // === DEBUG LOGS ===
        console.log("DEBUG [toggleToUnread]: notifId passed in is:", notifId);

        const payload = { notification_id: Number(notifId) };
        console.log("DEBUG [toggleToUnread]: Payload being sent to FastAPI:", JSON.stringify(payload));

        setNotifications(prev => prev.map(n =>
            n.id == notifId
                ? { ...n, is_read: false }
                : n
        ));

        try {
            const response = await fetch(`${API_BASE}/notifications/unread_one/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                credentials: "include",
            });

            if (!response.ok) {
                const errData = await response.json();
                // === DEBUG LOGS ===
                console.error("DEBUG [toggleToUnread]: FastAPI returned error!", errData);
                setErrorModal({ isOpen: true, subject: "Error", message: "Failed to mark notification as unread." });
                
                // Revert the UI state because it failed!
                setNotifications(prev => prev.map(n =>
                    n.id == notifId ? { ...n, is_read: true } : n
                ));
            } else {
                console.log("DEBUG [toggleToUnread]: Successfully marked as unread on server!");
            }
        } catch (err) {
            console.error("Network error toggling status:", err);
        }
    };

    const openMarkAllConfirmModal = () => setMarkAllConfirmModal(true);
    const closeMarkAllConfirmModal = () => setMarkAllConfirmModal(false);

    const markAllAsRead = async () => {
        closeMarkAllConfirmModal();
        try {
            const response = await fetch(`${API_BASE}/notifications/read_all/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });
            if (response.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            } else {
                setErrorModal({ isOpen: true, subject: "Error", message: "Failed to mark all notifications as read." });
            }
        } catch (err) {
            console.error("Failed to mark all as read:", err);
            setErrorModal({ isOpen: true, subject: "Connection Error", message: "Check your network or server status." });
        }
    };

    const handleRowClick = (item) => {
        setSelectedNotif(item);
        setModalTab('updates');

        if (!item.is_read) {
            markAsRead(item.id);

            setSelectedNotif(prev => ({
                ...prev,
                is_read: true
            }));
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const filteredNotifs = notifications.filter(n => {
        const searchLower = searchTerm.toLowerCase().trim();
        const matchesSearch =
            (n.content || "").toLowerCase().includes(searchLower) ||
            String(n.transaction_id || n.ticket_id || "").includes(searchLower);

        let matchesTab = true;
        if (activeTab === 'unread') {
            matchesTab = !n.is_read;
        } else if (activeTab === 'read') {
            matchesTab = n.is_read;
        } else if (activeTab === 'processed') {
            matchesTab = !!n.is_processed;
        } else if (activeTab === 'unprocessed') {
            matchesTab = !n.is_processed;
        }

        if (searchLower !== '') {
            return matchesSearch;
        }
        return matchesTab;
    });

    const getTabCount = (tab) => {
        if (tab === 'all') return notifications.length;
        if (tab === 'unread') return notifications.filter(n => !n.is_read).length;
        if (tab === 'read') return notifications.filter(n => n.is_read).length;
        if (tab === 'processed') return notifications.filter(n => n.is_processed).length;
        if (tab === 'unprocessed') return notifications.filter(n => !n.is_processed).length;
        return 0;
    };

    const getTabLabel = (tab) => {
        if (tab === 'unprocessed') return 'Unprocessed';
        return tab.charAt(0).toUpperCase() + tab.slice(1);
    };

    return (
        <section className="detail-view-container">
            <div className="detail-view-header">
                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                    <div className="body-header-font" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-start', width: '100%', fontWeight: 600 }}>
                        Notification Overview {unreadCount > 0 && `(${unreadCount} New)`}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', width: '100%' }}>
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

                        {notifications.some(n => !n.is_read) && (
                            <button
                                className="review-btn"
                                onClick={openMarkAllConfirmModal}
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
            </div>

            <div className="tabs-container" style={{ marginTop: '20px' }}>
                {['all', 'unread', 'read', 'processed', 'unprocessed'].map(tab => (
                    <div
                        key={tab}
                        className={`tab-item ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {getTabLabel(tab)}
                        <span className="tab-count">
                            ({getTabCount(tab)})
                        </span>
                    </div>
                ))}
            </div>

            <div className="ticket-list-wrapper" style={{ borderRadius: '0 0 8px 8px', borderTop: 'none' }}>
                {loading && !isRefreshing ? (
                    <p style={{ padding: '20px' }}>Loading notifications...</p>
                ) : filteredNotifs.length > 0 ? (
                    <table className="overview-table">
                        <thead>
                            <tr>
                                <th>Notification</th>
                                <th>Time and Date</th>
                                <th style={{ textAlign: 'center' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredNotifs.map((n) => (
                                <tr
                                    key={n.id}
                                    className="clickable-row"
                                    onClick={() => handleRowClick(n)}
                                    // Make unread rows light blue instead of green
                                    style={{ backgroundColor: n.is_read ? 'transparent' : '#e0f2fe' }}
                                >
                                    <td style={{ maxWidth: '400px' }}>
                                        <div style={{ fontWeight: n.is_read ? 'normal' : '600', color: '#2c3e50' }}>{n.content}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#024f3e', marginTop: '4px' }}>
                                            Transaction ID: #{n.transaction_id || n.ticket_id}
                                        </div>
                                    </td>
                                    <td>
    {n.date ? new Date(n.date).toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'N/A'}
</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            
                                            {/* PROCESSED / UNPROCESSED PILL (Green for Processed, Red for Unprocessed) */}
                                            <span style={{ 
                                                padding: '4px 10px', 
                                                borderRadius: '12px', 
                                                fontSize: '0.75rem', 
                                                fontWeight: 'bold',
                                                backgroundColor: n.is_processed ? '#dcfce7' : '#fee2e2', 
                                                color: n.is_processed ? '#166534' : '#991b1b' 
                                            }}>
                                                {n.is_processed ? 'Processed' : 'Unprocessed'}
                                            </span>
                                            
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p style={{ padding: '40px', textAlign: 'center', color: '#999' }}>No {activeTab} notifications found.</p>
                )
                }
            </div>

            {markAllConfirmModal && (
                <div className="modal-overlay" onClick={closeMarkAllConfirmModal}>
                    <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
                        <div className="modal-header" style={{ backgroundColor: '#740A03', borderBottom: '1px solid #5f0802' }}>
                            <h2 className="body-header-font3" style={{ color: '#fff', paddingBottom: 0, margin: 0 }}>Mark all notifications as read?</h2>
                            <button className="close-btn" onClick={closeMarkAllConfirmModal} style={{ color: '#fff', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="description-body" style={{ background: 'transparent', padding: 0 }}>
                                <p style={{ margin: 0, lineHeight: 1.6, color: '#2c3e50' }}>
                                    Are you sure you want to mark all notifications as read?
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ gap: '8px' }}>
                            <button type="button" className="cancel-btn" onClick={closeMarkAllConfirmModal}>
                                Cancel
                            </button>
                            <button type="button" className="review-btn" onClick={markAllAsRead} style={{ margin: 0 }}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {errorModal.isOpen && (
                <ErrorMessage
                    subject={errorModal.subject}
                    message={errorModal.message}
                    onReturn={closeErrorModal}
                />
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
                                <p>Transaction Reference: <strong>#{selectedNotif.transaction_id || selectedNotif.ticket_id}</strong></p>
                                
                                <p><strong></strong> {selectedNotif.date ? new Date(selectedNotif.date).toLocaleString() : 'N/A'}</p>
                            </div>
                            <div className="description-body">
                                <label className="body-content-text" style={{ fontWeight: 700 }}>Message:</label>
                                <p style={{ marginTop: '8px', color: '#2c3e50' }}>{selectedNotif.content}</p>
                            </div>
                        </div>

                        <div style={{ textAlign: 'right', padding: '18px', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#ffffff' }}>
                            {selectedNotif.is_read && (
                                <button
                                    className="update-btn"
                                    onClick={() => {
                                        toggleToUnread(selectedNotif.id);
                                        setSelectedNotif(prev => ({
                                            ...prev,
                                            is_read: false
                                        }));
                                    }}
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