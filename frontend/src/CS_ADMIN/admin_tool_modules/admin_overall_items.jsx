import React, { useState, useEffect } from 'react';
import { ErrorMessage } from '../../tool_modules/error_message.jsx';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import { LoadingPage } from '../../tool_modules/loading_page.jsx';

export const AdminOverallItemsOverview = () => {
    const [inventory, setInventory] = useState([]);
    const [expandedItem, setExpandedItem] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Error and Success Modals
    const [errorModal, setErrorModal] = useState({ isOpen: false, subject: "", message: "" });
    const closeErrorModal = () => setErrorModal({ ...errorModal, isOpen: false });

    

    const toggleExpand = (itemId) => {
        setExpandedItem(expandedItem === itemId ? null : itemId);
    };

    const fetchInventory = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/items/get_all_full`, {
                method: "GET",
                credentials: "include",                
            });
            const data = await response.json();
            if (response.ok) {
                setInventory(data.items || []);
                console.log("Fetched Inventory:", data.items);
            } else {
                setErrorModal({
                    isOpen: true,
                    subject: data.detail?.subject || "Error fetching inventory",
                    message: data.detail?.message || "Check backend console for errors."
                });
            }
        } catch (error) {
            setErrorModal({ isOpen: true, subject: "Fetch Error", message: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchInventory(); }, []);

    if (isLoading) return <LoadingPage />;

    // Add Attachment
    const handleAddAttachment = async (itemId, e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessing(true);

        const formData = new FormData();
        formData.append('item_id', itemId);
        formData.append('file', file);

        try {
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/items/add_attachment/`, {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setErrorModal({ 
                    isOpen: true,
                    subject: data.detail?.subject || "Upload Success",
                    message: data.detail?.message || "Image attached successfully."
                });
                fetchInventory();
            } else {
                setErrorModal({
                    isOpen: true,
                    subject: data.detail?.subject || "Upload Failed",
                    message: data.detail?.message || "Check backend console for errors."
                });
            }
        } catch (error) {
            setErrorModal({ isOpen: true, subject: "Network Error", message: error.message });
        } finally {
            setIsProcessing(false);
            e.target.value = null; // Reset file input so you can pick the same file again
        }
    };
    
    // Edit Attachment
    const handleEditAttachment = async (itemId, e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessing(true);
        const formData = new FormData();
        formData.append('item_id', itemId);
        formData.append('file', file);  
        try {
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/items/edit_attachment/`, {
                method: "POST",
                credentials: "include",
                body: formData,
            });
            if (response.ok) {
                const data = await response.json();
                setErrorModal({ 
                    isOpen: true,
                    subject: data.detail?.subject || "Update Success",
                    message: data.detail?.message || "Image updated successfully."
                });
                fetchInventory();
            } else {
                const data = await response.json();
                setErrorModal({
                    isOpen: true,
                    subject: data.detail?.subject || "Update Failed",
                    message: data.detail?.message || "Check backend console for errors."
                });
            }
        } catch (error) {
            setErrorModal({ isOpen: true, subject: "Network Error", message: error.message });
        } finally {
            setIsProcessing(false);
            e.target.value = null; // Reset file input so you can pick the same file again
        }
    };

    const handleDeleteAttachment = async (itemId) => {
        if (!window.confirm("Are you sure you want to delete this attachment?")) return;

        setIsProcessing(true);
        try {
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/items/delete_attachment/`, {
                method: "POST",
                credentials: "include",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: itemId })
            });
            const data = await response.json();
            if (response.ok) {
                setErrorModal({ 
                    isOpen: true,
                    subject: data.detail?.subject || "Deletion Success",
                    message: data.detail?.message || "Attachment deleted successfully."
                });
                fetchInventory();
            } else {
                setErrorModal({
                    isOpen: true,
                    subject: data.detail?.subject || "Deletion Failed",
                    message: data.detail?.message || "Check backend console for errors."
                });
            }
        } catch (error) {
            setErrorModal({ isOpen: true, subject: "Network Error", message: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
    <div className="overall-items-container">
        <div className="inventory-list-header">
            <span className="col-name">Item Name</span>
            <span className="col-desc">Description</span>
            <span className="col-stock">Total Units</span>
            <span className="col-action">Quick Actions</span>
        </div>

        {inventory.length === 0 ? (
            <div className="empty-state">No items found. Try importing some items first.</div>
        ) : (
            inventory.map(entry => (
                <div key={entry.id} className="inventory-group">
                    <div className="item-main-row">
                        {/* Clickable area to expand details */}
                        <div className="clickable-area" onClick={() => toggleExpand(entry.id)}>
                            <span className="col-name">
                                {entry.name} 
                                {entry.image_uuid && <span className="img-badge" title="Has Image">🖼️</span>}
                            </span>
                            <span className="col-desc">{entry.description || "No description provided"}</span>
                            <span className="col-stock">{entry.stocks?.length || 0} Units</span>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="col-action">
                            <input 
                                type="file" 
                                id={`attach-input-${entry.id}`} 
                                style={{ display: 'none' }} 
                                accept="image/*"
                                onChange={(e) => {
                                    if (entry.image_uuid) {
                                        handleEditAttachment(entry.id, e);
                                    } else {
                                        handleAddAttachment(entry.id, e);
                                    }
                                }}
                            />
                            
                            <button 
                                className="test-attach-btn"
                                onClick={() => document.getElementById(`attach-input-${entry.id}`).click()}
                                disabled={isProcessing}
                                style={{ 
                                    backgroundColor: entry.image_uuid ? '#27ae60' : '#2980b9', 
                                    color: 'white',
                                    cursor: isProcessing ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isProcessing ? "..." : (entry.image_uuid ? "Update Image" : "Add Image")}
                            </button>

                            {entry.image_uuid && (
                                <button 
                                    className="delete-attach-btn"
                                    onClick={() => handleDeleteAttachment(entry.id)}
                                    disabled={isProcessing}
                                    style={{ 
                                        marginLeft: '8px', 
                                        backgroundColor: '#e74c3c', 
                                        color: 'white',
                                        cursor: isProcessing ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Dropdown for expanded view */}
                    {expandedItem === entry.id && (
                        <div className="unit-details-dropdown" style={{ backgroundColor: '#f9f9f9', borderTop: '1px solid #eee' }}>
                            <div style={{ padding: '15px' }}>
                                <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '10px' }}>
                                    <strong>System Info:</strong> Item ID: {entry.id} | UUID: {entry.image_uuid || "None"}
                                </p>
                                
                                {entry.stocks && entry.stocks.length > 0 ? (
                                    <table className="mini-stock-table" style={{ width: '100%', fontSize: '0.9rem' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                                                <th>Serial Number</th>
                                                <th>Status</th>
                                                <th>Condition</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {entry.stocks.map((stock, idx) => (
                                                <tr key={idx}>
                                                    <td>{stock.serial_number}</td>
                                                    <td>{stock.status}</td>
                                                    <td>{stock.condition}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p style={{ color: '#999', fontStyle: 'italic' }}>No stock units assigned to this item.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ))
        )}

            {errorModal.isOpen && (
                <ErrorMessage 
                    subject={errorModal.subject} 
                    message={errorModal.message} 
                    onReturn={closeErrorModal} 
                />
            )}
        </div>
    );
};