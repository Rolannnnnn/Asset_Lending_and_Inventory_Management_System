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
            setErrorModal({ isOpen: true, subject: "Fetch Error", message: err.message });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // Attachment Handler (Unified Add/Edit)
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
                setErrorModal({ 
                    isOpen: true,
                    subject: data.detail?.subject || "Success",
                    message: data.detail?.message || "Operation successful."
                });
                fetchItems(); // Refresh inventory to show new image_uuid
            } else {
                setErrorModal({
                    isOpen: true,
                    subject: data.detail?.subject || "Error",
                    message: data.detail?.message || "Action failed."
                });
            }
        } catch (error) {
            setErrorModal({ isOpen: true, subject: "Network Error", message: error.message });
        } finally {
            setIsProcessing(false);
            e.target.value = null; 
        }
    };

    const toggleItem = (itemId) => {
        setExpandedItem(prev => (prev === itemId ? null : itemId));
    };

    if (loading) return <LoadingPage />;

    return (
        <div className="body-main-content">
            <div className="dashboard-header-container">
                <h1 className="body-header-font">Inventory Overview</h1>
            </div>

            <div className="card-container">
                {items.length === 0 ? (
                    <div className="p-4 text-center">
                        <p className="body-content-text3">No inventory records found.</p>
                    </div>
                ) : (
                    <table className="overview-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Item Name</th>
                                <th>Description</th>
                                <th>Total Stocks</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <React.Fragment key={item.id}>
                                    <tr className={`clickable-row ${expandedItem === item.id ? 'active-row' : ''}`}>
                                        <td onClick={() => toggleItem(item.id)}>#{item.id}</td>
                                        <td onClick={() => toggleItem(item.id)} style={{ fontWeight: 'bold' }}>
                                            {item.name} {item.image_uuid && <span title="Has Attachment">🖼️</span>}
                                        </td>
                                        <td onClick={() => toggleItem(item.id)}>{item.description}</td>
                                        <td onClick={() => toggleItem(item.id)}>{item.stocks?.length || 0} Units</td>
                                        <td>
                                            {/* Hidden Input */}
                                            <input 
                                                type="file" 
                                                id={`attach-${item.id}`} 
                                                style={{display: 'none'}} 
                                                accept="image/*"
                                                onChange={(e) => handleAttachmentAction(item.id, e, item.image_uuid ? 'edit' : 'add')}
                                            />
                                            <button 
                                                className="test-attach-btn"
                                                onClick={() => document.getElementById(`attach-${item.id}`).click()}
                                                disabled={isProcessing}
                                                style={{ 
                                                    backgroundColor: item.image_uuid ? '#27ae60' : '#2980b9', 
                                                    color: 'white',
                                                    padding: '5px 10px',
                                                    borderRadius: '4px',
                                                    border: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {isProcessing ? "..." : (item.image_uuid ? "Update Image" : "Attach Image")}
                                            </button>
                                        </td>
                                    </tr>

                                    {expandedItem === item.id && (
                                        <tr className="cascade-row">
                                            <td colSpan="5" className="cascade-cell">
                                                <div className="cascade-wrapper">
                                                    <p style={{fontSize: '0.8rem', color: '#888'}}>
                                                        Internal ID: {item.id} | UUID: {item.image_uuid || "No attachment"}
                                                    </p>
                                                    <table className="overview-table cascade-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Serial Number</th>
                                                                <th>Status</th>
                                                                <th>Condition</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {item.stocks?.map((stock, idx) => (
                                                                <tr key={idx}>
                                                                    <td><code>{stock.serial_number}</code></td>
                                                                    <td>{stock.status}</td>
                                                                    <td>{stock.condition}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
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