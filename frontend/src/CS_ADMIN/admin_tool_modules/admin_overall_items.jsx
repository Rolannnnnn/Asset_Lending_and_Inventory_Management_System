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
    // Delete Attachment
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
            {/* HEADER ROW */}
            <div className="inventory-list-header">
                <span className="col-name">Item Name</span>
                <span className="col-desc">Description</span>
                <span className="col-stock">Total Units</span>
                <span className="col-action">Quick Actions</span>
            </div>

            {/* DATA ROWS */}
            {inventory.length === 0 ? (
                <div className="empty-state">No items found. Try importing some items first.</div>
            ) : (
                inventory.map(entry => (
                    <div key={entry.id} className="inventory-group">
                        <div className="item-main-row">
                            <div className="clickable-area" onClick={() => toggleExpand(entry.id)}>
                                <span className="col-name">
                                    <div className="img-container">
                                        {entry.image_path ? (
                                            <img
                                                src={`${CONFIG.ip}:${CONFIG.port}/static/${entry.image_path.split('/').pop()}`}
                                                alt=""
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="no-img-placeholder">No Image</div>
                                        )}
                                    </div>
                                    <span className="item-text-name">{entry.name}</span>
                                </span>

                                <span className="col-desc">
                                    {entry.description || "No description"}
                                </span>

                                <span className="col-stock">
                                    {entry.stocks?.length || 0} Units
                                </span>
                            </div>

                            <div className="col-action">
                                <input
                                    type="file"
                                    id={`attach-input-${entry.id}`}
                                    className="hidden-input"
                                    accept="image/*"
                                    onChange={(e) => entry.image_uuid ? handleEditAttachment(entry.id, e) : handleAddAttachment(entry.id, e)}
                                />

                                <button
                                    className={`test-attach-btn ${entry.image_uuid ? 'btn-update' : 'btn-add'}`}
                                    onClick={() => document.getElementById(`attach-input-${entry.id}`).click()}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? "..." : (entry.image_uuid ? "Update Image" : "Add Image")}
                                </button>

                                {entry.image_uuid && (
                                    <button
                                        className="delete-attach-btn"
                                        onClick={() => handleDeleteAttachment(entry.id)}
                                        disabled={isProcessing}
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* EXPANDED DETAILS */}
                        {expandedItem === entry.id && (
                            <div className="unit-details-dropdown">
                                <p className="system-info">
                                    <strong>System Info:</strong> Item ID: {entry.id} | UUID: {entry.image_uuid || "None"}
                                </p>
                                <table className="stock-table">
                                    <thead>
                                        <tr>
                                            <th>Serial Number</th>
                                            <th>Status</th>
                                            <th>Condition</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {entry.stocks && entry.stocks.length > 0 ? (
                                            entry.stocks.map((stock, idx) => (
                                                <tr key={idx}>
                                                    <td>{stock.serial_number}</td>
                                                    <td>{stock.status}</td>
                                                    <td>{stock.condition}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="3" className="no-records">No records found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ))
            )}

            {errorModal.isOpen && (
                <ErrorMessage subject={errorModal.subject} message={errorModal.message} onReturn={closeErrorModal} />
            )}
        </div>
    );
};