import React, { useState, useEffect, useCallback } from 'react';
import { ErrorMessage } from '../../tool_modules/error_message.jsx';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import { LoadingPage } from '../../tool_modules/loading_page.jsx';

const API_BASE = `${CONFIG.ip}:${CONFIG.port}/items`;

export const AdminOverallItemsOverview = () => {
    const [inventory, setInventory] = useState([]);
    const [expandedItem, setExpandedItem] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    
    // Form States
    const [newItem, setNewItem] = useState({ name: '', description: '', file: null });
    const [editingItem, setEditingItem] = useState({ item_id: null, name: '', description: '' });

    const [errorModal, setErrorModal] = useState({ isOpen: false, subject: "", message: "" });
    const closeErrorModal = () => setErrorModal({ ...errorModal, isOpen: false });

    const fetchInventory = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/get_all_full/`, {
                method: "GET",
                credentials: "include",
            });
            const data = await response.json();
            if (response.ok) {
                setInventory(data.items || []);
            }
        } catch (error) {
            setErrorModal({ isOpen: true, subject: "Fetch Error", message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchInventory(); }, [fetchInventory]);

    const handleAddItem = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        const formData = new FormData();
        formData.append('name', newItem.name);
        formData.append('description', newItem.description);
        if (newItem.file) formData.append('file', newItem.file);

        try {
            const response = await fetch(`${API_BASE}/add_item/`, {
                method: "POST",
                credentials: "include",
                body: formData,
            });
            if (response.ok) {
                setShowAddModal(false);
                setNewItem({ name: '', description: '', file: null });
                fetchInventory();
            }
        } finally { setIsProcessing(false); }
    };

    const handleUpdateDetails = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const response = await fetch(`${API_BASE}/edit_detail_item/`, {
                method: "POST",
                credentials: "include",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingItem)
            });
            if (response.ok) {
                setShowEditModal(false);
                fetchInventory();
            }
        } finally { setIsProcessing(false); }
    };

    const handleToggleStatus = async (itemId, currentActive) => {
        const action = currentActive ? "deactivate" : "activate";
        if (!window.confirm(`Are you sure you want to ${action} this item?`)) return;
        
        setIsProcessing(true);
        try {
            await fetch(`${API_BASE}/edit_status_item/`, {
                method: "POST",
                credentials: "include",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    item_id: itemId, 
                    to_active: !currentActive 
                })
            });
            fetchInventory();
        } finally { setIsProcessing(false); }
    };

    const handleAttachmentAction = async (itemId, e, mode) => {
        e.stopPropagation();
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessing(true);
        const formData = new FormData();
        formData.append('item_id', itemId);
        formData.append('file', file);
        const endpoint = mode === 'edit' ? 'edit_attachment' : 'add_attachment';

        try {
            await fetch(`${API_BASE}/${endpoint}/`, {
                method: "POST",
                credentials: "include",
                body: formData,
            });
            fetchInventory();
        } finally {
            setIsProcessing(false);
            e.target.value = null;
        }
    };

    const handleDeleteAttachment = async (itemId) => {
        if (!window.confirm("Delete this image?")) return;
        setIsProcessing(true);
        try {
            await fetch(`${API_BASE}/delete_attachment/`, {
                method: "POST",
                credentials: "include",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: itemId })
            });
            fetchInventory();
        } finally { setIsProcessing(false); }
    };

    if (isLoading) return <LoadingPage />;

    return (
        <div className="body-main-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 className="body-header-font">Inventory Management</h1>
                <button className="reopen-btn" style={{ margin: 0, padding: '10px 20px' }} onClick={() => setShowAddModal(true)}>
                    + Add New Item
                </button>
            </div>

            <div className="card-container">
                <table className="overview-table">
                    <thead>
                        <tr>
                            <th>Item Details</th>
                            <th>Description</th>
                            <th>Total Units</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventory.map(entry => (
                            <React.Fragment key={entry.id}>
                                <tr 
                                    className={`clickable-row ${expandedItem === entry.id ? 'active-row' : ''}`} 
                                    onClick={() => setExpandedItem(expandedItem === entry.id ? null : entry.id)}
                                >
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div className="img-container" style={{ width: '45px', height: '45px', overflow: 'hidden', borderRadius: '4px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {entry.image_path ? (
                                                    <img 
                                                        src={`${CONFIG.ip}:${CONFIG.port}/static/${entry.image_path.split('/').pop()}`} 
                                                        alt="" 
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                    />
                                                ) : <span style={{ fontSize: '10px', color: '#aaa' }}>No Img</span>}
                                            </div>
                                            <strong>{entry.name}</strong>
                                        </div>
                                    </td>
                                    <td>{entry.description || "N/A"}</td>
                                    <td>{entry.stocks?.length || 0} Units</td>
                                    <td>
                                        <span className={`status-pill ${entry.is_active || entry.is_available? 'completed' : 'to-do'}`}>
                                            {entry.is_active || entry.is_available ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                    </td>
                                </tr>

                                {expandedItem === entry.id && (
                                    <tr>
                                        <td colSpan="4" className="cascade-cell">
                                            <div className="cascade-wrapper" style={{ padding: '20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button className="review-btn" style={{ margin: 0 }} onClick={(e) => { e.stopPropagation(); setEditingItem({ item_id: entry.id, name: entry.name, description: entry.description }); setShowEditModal(true); }}>
                                                            Edit Details
                                                        </button>
                                                        <button className="assign-btn" style={{ margin: 0, backgroundColor: entry.active ? '#e67e22' : '#27ae60' }} onClick={(e) => { e.stopPropagation(); handleToggleStatus(entry.id, entry.active); }}>
                                                            {entry.active ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <input type="file" id={`file-input-${entry.id}`} style={{ display: 'none' }} onChange={(e) => handleAttachmentAction(entry.id, e, entry.image_uuid ? 'edit' : 'add')} />
                                                        <button className="review-btn" style={{ margin: 0 }} onClick={(e) => { e.stopPropagation(); document.getElementById(`file-input-${entry.id}`).click(); }}>
                                                            {entry.image_uuid ? "Change Image" : "Attach Image"}
                                                        </button>
                                                        {entry.image_uuid && <button className="assign-btn" style={{ margin: 0, backgroundColor: '#d9534f' }} onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(entry.id); }}>Remove Image</button>}
                                                    </div>
                                                </div>
                                                <table className="overview-table cascade-table">
                                                    <thead><tr><th>Serial Number</th><th>Status</th><th>Condition</th></tr></thead>
                                                    <tbody>
                                                        {entry.stocks?.length > 0 ? entry.stocks.map((s, i) => (
                                                            <tr key={i}>
                                                                <td><code>{s.serial_number}</code></td>
                                                                <td><span className={`status-pill ${s.status === 'AVAILABLE' ? 'completed' : 'to-do'}`}>{s.status}</span></td>
                                                                <td>{s.condition}</td>
                                                            </tr>
                                                        )) : <tr><td colSpan="3">No units.</td></tr>}
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
            </div>

            {/* MODALS: ADD & EDIT */}
            {(showAddModal || showEditModal) && (
                <div className="modal-overlay" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
                    <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h3 className="body-header-font3">{showAddModal ? "Register New Item" : "Edit Item Details"}</h3>
                        </div>
                        <form onSubmit={showAddModal ? handleAddItem : handleUpdateDetails}>
                            <div className="modal-body">
                                <div className="description-body">
                                    <label>Item Name</label>
                                    <input 
                                        type="text" 
                                        className="text-box-editable" 
                                        required 
                                        value={showAddModal ? newItem.name : editingItem.name} 
                                        onChange={(e) => showAddModal ? setNewItem({...newItem, name: e.target.value}) : setEditingItem({...editingItem, name: e.target.value})} 
                                    />
                                    <label style={{ marginTop: '10px' }}>Description</label>
                                    <textarea 
                                        className="text-box-editable" 
                                        style={{ minHeight: '80px' }} 
                                        value={showAddModal ? newItem.description : editingItem.description} 
                                        onChange={(e) => showAddModal ? setNewItem({...newItem, description: e.target.value}) : setEditingItem({...editingItem, description: e.target.value})} 
                                    />
                                    {showAddModal && (
                                        <>
                                            <label style={{ marginTop: '10px' }}>Initial Attachment</label>
                                            <input type="file" accept="image/*" onChange={(e) => setNewItem({...newItem, file: e.target.files[0]})} />
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="reopen-btn" disabled={isProcessing}>Confirm</button>
                                <button type="button" className="cancel-btn" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {errorModal.isOpen && <ErrorMessage subject={errorModal.subject} message={errorModal.message} onReturn={closeErrorModal} />}
        </div>
    );
};