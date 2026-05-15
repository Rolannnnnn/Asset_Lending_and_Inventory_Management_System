import React, { useEffect, useState, useCallback } from 'react';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import { ErrorMessage } from '../../tool_modules/error_message.jsx';
import { LoadingPage } from '../../tool_modules/loading_page.jsx';

import '../../css_formats/header.css';
import '../../css_formats/sidebar.css';
import '../../css_formats/body_and_container.css';
import '../../css_formats/global_body.css';

const API_BASE = `${CONFIG.ip}:${CONFIG.port}/items`;

export function InventoryOverview({ user, handleLogout }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedItem, setExpandedItem] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Error Modal State
    const [errorModal, setErrorModal] = useState({ isOpen: false, subject: "", message: "" });
    const closeErrorModal = () => setErrorModal({ ...errorModal, isOpen: false });

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            // Using POST with empty body as per your previous setup
            const response = await fetch(`${API_BASE}/get_all_full/`, {
                method: "POST", 
                credentials: "include",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) 
            });

            if (!response.ok) throw new Error(`Server Error: ${response.status}`);

            const data = await response.json();
            setItems(data.items || []);
        } catch (err) {
            console.error("Fetch Error:", err);
            setErrorModal({ isOpen: true, subject: "Connection Error", message: err.message });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleAttachmentAction = async (itemId, e, mode = 'add') => {
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessing(true);
        const formData = new FormData();
        formData.append('item_id', itemId);
        formData.append('file', file);

        const endpoint = mode === 'add' ? 'add_attachment' : 'edit_attachment';

        try {
            const response = await fetch(`${API_BASE}/${endpoint}/`, {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                // Refresh list to update image_uuid state
                fetchItems(); 
            } else {
                setErrorModal({
                    isOpen: true,
                    subject: data.detail?.subject || "Upload Failed",
                    message: data.detail?.message || "Could not process the image."
                });
            }
        } catch (error) {
            setErrorModal({ isOpen: true, subject: "Network Error", message: error.message });
        } finally {
            setIsProcessing(false);
            e.target.value = null; 
        }
    };

    if (loading) return <LoadingPage />;

    return (
        <div className="body-main-content">
            <div className="dashboard-header-container" style={{ marginBottom: '20px' }}>
                <h1 className="body-header-font">System Inventory</h1>
            </div>

            <div className="card-container">
                {items.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                        <p>No inventory records found in the database.</p>
                    </div>
                ) : (
                    <table className="overview-table">
                        <thead>
                            <tr>
                                <th style={{ width: '80px' }}>ID</th>
                                <th>Item Details</th>
                                <th>Description</th>
                                <th>Total Stock</th>
                                <th style={{ textAlign: 'right' }}>Media Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => {
                                const isExpanded = expandedItem === item.id;
                                return (
                                    <React.Fragment key={item.id}>
                                        <tr 
                                            className={`clickable-row ${isExpanded ? 'active-row' : ''}`}
                                            onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                                        >
                                            <td><code style={{ color: '#7f8c8d' }}>#{item.id}</code></td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontWeight: '600' }}>{item.name}</span>
                                                    {item.image_uuid && (
                                                        <span title="Image Attached" style={{ fontSize: '0.9rem' }}>🖼️</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ color: '#636e72' }}>{item.description || "No description provided."}</td>
                                            <td>
                                                <span className={`status-pill ${item.stocks?.length > 0 ? 'completed' : 'to-do'}`}>
                                                    {item.stocks?.length || 0} Units
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                                <input 
                                                    type="file" 
                                                    id={`attach-${item.id}`} 
                                                    hidden 
                                                    accept="image/*"
                                                    onChange={(e) => handleAttachmentAction(item.id, e, item.image_uuid ? 'edit' : 'add')}
                                                />
                                                <button 
                                                    className="review-btn"
                                                    style={{ margin: 0, padding: '6px 12px', fontSize: '0.8rem' }}
                                                    onClick={() => document.getElementById(`attach-${item.id}`).click()}
                                                    disabled={isProcessing}
                                                >
                                                    {isProcessing ? "..." : (item.image_uuid ? "Update Img" : "Add Img")}
                                                </button>
                                            </td>
                                        </tr>

                                        {isExpanded && (
                                            <tr>
                                                <td colSpan="5" className="cascade-cell">
                                                    <div className="cascade-wrapper" style={{ padding: '20px', background: '#fcfcfc' }}>
                                                        <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between' }}>
                                                            <strong style={{ fontSize: '0.9rem' }}>Unit Records</strong>
                                                            <span style={{ fontSize: '0.75rem', color: '#95a5a6' }}>UUID: {item.image_uuid || "Unlinked"}</span>
                                                        </div>
                                                        
                                                        <table className="overview-table cascade-table">
                                                            <thead>
                                                                <tr>
                                                                    <th>Serial Number</th>
                                                                    <th>Status</th>
                                                                    <th>Condition</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {item.stocks?.length > 0 ? item.stocks.map((stock, idx) => (
                                                                    <tr key={idx}>
                                                                        <td><code>{stock.serial_number}</code></td>
                                                                        <td>
                                                                            <span className={`status-pill ${stock.status === 'AVAILABLE' ? 'completed' : 'to-do'}`}>
                                                                                {stock.status}
                                                                            </span>
                                                                        </td>
                                                                        <td>{stock.condition}</td>
                                                                    </tr>
                                                                )) : (
                                                                    <tr>
                                                                        <td colSpan="3" style={{ textAlign: 'center', color: '#bdc3c7', padding: '15px' }}>
                                                                            No individual stock units registered for this item.
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {errorModal.isOpen && (
                <ErrorMessage 
                    subject={errorModal.subject} 
                    message={errorModal.message} 
                    onReturn={closeErrorModal} 
                />
            )}
        </div>
    );
}