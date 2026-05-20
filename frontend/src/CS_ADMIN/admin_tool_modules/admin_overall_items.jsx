import React, { useState, useEffect, useCallback } from 'react';
import { ErrorMessage } from '../../tool_modules/error_message.jsx';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import { LoadingPage } from '../../tool_modules/loading_page.jsx';

import newItemIcon from '../../assets/new_item_icon.svg';
import editDetailsIcon from '../../assets/edit_details_icon.svg';
import activateOnIcon from '../../assets/activate_on_icon.svg';
import activateOffIcon from '../../assets/activate_off_icon.svg';
import uploadImageIcon from '../../assets/upload_image_icon.svg';
import updateImageIcon from '../../assets/update_image_icon.svg';

const API_BASE = `${CONFIG.ip}:${CONFIG.port}/items`;

export const AdminOverallItemsOverview = () => {

    const [inventory, setInventory] = useState([]);
    const [expandedItem, setExpandedItem] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const [activeModal, setActiveModal] = useState(null);
    const [formData, setFormData] = useState({ id: null, name: '', description: '', file: null });
    const [importFormData, setImportFormData] = useState({ file: null });
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [stockModalMode, setStockModalMode] = useState('edit');
    const [stockFormData, setStockFormData] = useState({ item_id: '', serial_number: '', status: 'AVAILABLE', condition: '' });
    const [errorModal, setErrorModal] = useState({ isOpen: false, subject: "", message: "" });

    const closeModals = () => {
        setActiveModal(null);
        setFormData({ id: null, name: '', description: '', file: null });

        setIsStockModalOpen(false);
        setStockModalMode('edit');
        setStockFormData({ item_id: '', serial_number: '', status: 'AVAILABLE', condition: '' });
    };

    const triggerError = (subject, message) => {
        setErrorModal({ isOpen: true, subject, message });
    };

    const triggerSuccess = (message) => {
        setErrorModal({ isOpen: true, subject: "Success!", message });
    };

    const fetchInventory = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/get_all_full/`, {
                method: "GET",
                credentials: "include",
            });
            const data = await response.json();
            if (response.ok) {
                setInventory(data.items || data || []);
            } else {
                triggerError("Fetch Failed", data.detail?.message || "Could not load items.");
            }
        } catch (error) {
            triggerError("Network Error", error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const handleSaveItem = async (e) => {
        e.preventDefault();
        setIsProcessing(true);

        const isEdit = activeModal === 'edit';
        const endpoint = isEdit ? 'edit_detail_item' : 'add_item';

        try {
            let response;
            if (isEdit) {
                response = await fetch(`${API_BASE}/${endpoint}/`, {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    credentials: "include",
                    body: JSON.stringify({ item_id: formData.id, name: formData.name, description: formData.description })
                });
            } else {
                const body = new FormData();
                body.append('name', formData.name);
                body.append('description', formData.description);
                if (formData.file) body.append('file', formData.file);

                response = await fetch(`${API_BASE}/${endpoint}/`, {
                    method: "POST",
                    credentials: "include",
                    body
                });
            }

            if (response.ok) {
                closeModals();
                fetchInventory();
                triggerSuccess(isEdit ? "Item details updated successfully." : "Item added successfully.");
            } else {
                const errData = await response.json().catch(() => ({}));
                const subject = errData.detail?.subject || "Save Failed";
                const message = errData.detail?.message || "Operation failed.";
                triggerError(subject, message);
            }
        } catch (error) {
            triggerError("Error", error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleToggleStatus = async (itemId, currentActive) => {
        const action = currentActive ? "deactivate" : "activate";
        if (!window.confirm(`Are you sure you want to ${action} this item?`)) return;

        setIsProcessing(true);
        try {
            const response = await fetch(`${API_BASE}/edit_status_item/`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                credentials: "include",
                body: JSON.stringify({ item_id: itemId, to_active: !currentActive })
            });
            if (response.ok) {
                fetchInventory();
                triggerSuccess(`Item ${currentActive ? 'deactivated' : 'activated'} successfully.`);
            } else {
                const errData = await response.json().catch(() => ({}));
                const subject = errData.detail?.subject || "Update Failed";
                const message = errData.detail?.message || "Operation failed.";
                triggerError(subject, message);
            }
        } catch (error) {
            triggerError("Error", error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAttachment = async (itemId, e, mode) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessing(true);
        const body = new FormData();
        body.append('item_id', itemId);
        body.append('file', file);
        const endpoint = mode === 'edit' ? 'edit_attachment' : 'add_attachment';

        try {
            const response = await fetch(`${API_BASE}/${endpoint}/`, { method: "POST", credentials: "include", body });
            if (response.ok) {
                fetchInventory();
                triggerSuccess(mode === 'edit' ? "Image updated successfully." : "Image uploaded successfully.");
            } else {
                const errData = await response.json().catch(() => ({}));
                const subject = errData.detail?.subject || "Upload Failed";
                const message = errData.detail?.message || "Operation failed.";
                triggerError(subject, message);
            }
        } catch (error) {
            triggerError("Error", error.message);
        } finally {
            setIsProcessing(false);
            e.target.value = null;
        }
    };

    const handleSaveStock = async (e) => {
        e.preventDefault();
        setIsProcessing(true);

        try {
            const endpoint = stockModalMode === 'add' ? 'add_stock' : 'edit_stock';
            const response = await fetch(`${API_BASE}/${endpoint}/`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                credentials: "include",
                body: JSON.stringify({
                    item_id: Number(stockFormData.item_id),
                    serial_number: stockFormData.serial_number,
                    status: stockFormData.status,
                    condition: stockFormData.condition,
                })
            });

            if (response.ok) {
                closeModals();
                fetchInventory();
                triggerSuccess(stockModalMode === 'add' ? "Stock added successfully." : "Stock updated successfully.");
            } else {
                const errData = await response.json().catch(() => ({}));
                const subject = errData.detail?.subject || "Save Failed";
                const message = errData.detail?.message || "Operation failed.";
                triggerError(subject, message);
            }
        } catch (error) {
            triggerError("Error", error.message);
        } finally {
            setIsProcessing(false);
        }
    };


    const handleImportStocks = async (e) => {
        e.preventDefault();
        if (!importFormData.item_id || !importFormData.file) {
            triggerError("No File", "Please select a CSV file to import.");
            return;
        }

        setIsProcessing(true);
        const body = new FormData();
        body.append('item_id', importFormData.item_id);
        body.append('file', importFormData.file);
        try {
            const response = await fetch(`${API_BASE}/import_stocks/`, {
                method: "POST",
                credentials: "include",
                body
            });
            if (response.ok) {
                closeModals();
                fetchInventory();
                triggerSuccess("Stocks imported successfully.");
            } else {
                const errData = await response.json()
                const subject = errData.detail?.subject || "Import Failed";
                const message = errData.detail?.message || "Operation failed.";
                triggerError(subject, message);
            }
        } catch (error) {
            triggerError("Error", error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) return <LoadingPage />;

    return (
        <div className="body-main-content">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className="body-header-font">Inventory Control</h1>
                <button
                    className="reopen-btn"
                    onClick={() => setActiveModal('add')}
                    style={{
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <img src={newItemIcon} alt="" style={{ width: '16px', height: '16px' }} />
                    New Item
                </button>
            </header>

            <div className="card-container">
                <table className="overview-table">
                    <thead>
                        <tr>
                            <th>Asset</th>
                            <th>Description</th>
                            <th>Stock</th>
                            <th>Visibility</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventory.map(entry => {
                            const isExpanded = expandedItem === entry.id;
                            const isActive = entry.is_active || entry.is_available;

                            return (
                                <React.Fragment key={entry.id}>
                                    <tr
                                        className={`clickable-row ${isExpanded ? 'active-row' : ''}`}
                                        onClick={() => setExpandedItem(isExpanded ? null : entry.id)}
                                    >
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div className="img-container shadow-sm" style={{ width: '50px', height: '50px', borderRadius: '8px', background: '#eee', overflow: 'hidden' }}>
                                                    {entry.image_path ? (
                                                        <img
                                                            src={`${CONFIG.ip}:${CONFIG.port}/static/${entry.image_path.split('/').pop()}`}
                                                            alt={entry.name}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    ) : <span style={{ fontSize: '10px', color: '#999' }}>N/A</span>}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{entry.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ color: '#666' }}>{entry.description || "--"}</td>
                                        <td><strong>{entry.stocks?.length || 0}</strong></td>
                                        <td>
                                            <span className={`status-pill ${isActive ? 'completed' : 'to-do'}`}>
                                                {isActive ? 'ACTIVE' : 'HIDDEN'}
                                            </span>
                                        </td>
                                    </tr>

                                    {isExpanded && (
                                        <tr>
                                            <td colSpan="4" className="cascade-cell" style={{ background: '#fcfcfc' }}>
                                                <div className="cascade-wrapper" style={{ padding: '25px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            {/* Edit Button */}
                                                            <button
                                                                className="review-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setFormData({ id: entry.id, name: entry.name, description: entry.description });
                                                                    setActiveModal('edit');
                                                                }}
                                                                style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
                                                            >
                                                                <img src={editDetailsIcon} alt="" style={{ width: '16px', height: '16px' }} />
                                                                Edit Details
                                                            </button>

                                                            {/* Status Toggle Button */}
                                                            <button
                                                                className="assign-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleToggleStatus(entry.id, isActive);
                                                                }}
                                                                style={{
                                                                    backgroundColor: isActive ? '#e67e22' : '#27ae60',
                                                                    margin: 0,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    padding: '5px 10px',
                                                                    borderRadius: '8px',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                <img
                                                                    src={isActive ? activateOffIcon : activateOnIcon}
                                                                    alt=""
                                                                    style={{ width: '16px', height: '16px' }}
                                                                />
                                                                {isActive ? 'Deactivate' : 'Activate'}
                                                            </button>
                                                        </div>

                                                        {/* Image Upload/Update Button */}
                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <input
                                                                type="file"
                                                                id={`file-${entry.id}`}
                                                                hidden
                                                                onChange={(e) => handleAttachment(entry.id, e, entry.image_uuid ? 'edit' : 'add')}
                                                            />
                                                            <button
                                                                className="review-btn"
                                                                onClick={() => document.getElementById(`file-${entry.id}`).click()}
                                                                style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
                                                            >
                                                                <img
                                                                    src={entry.image_uuid ? updateImageIcon : uploadImageIcon}
                                                                    alt=""
                                                                    style={{ width: '16px', height: '16px' }}
                                                                />
                                                                {entry.image_uuid ? "Update Image" : "Upload Image"}
                                                            </button>
                                                            <button
                                                                className="reopen-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setImportFormData({ item_id: entry.id, file: null });
                                                                    setIsImportModalOpen(true);
                                                                }}
                                                                style={{ margin: 0 }}
                                                            >
                                                                Import Stocks
                                                            </button>


                                                        </div>
                                                    </div>

                                                    <table className="overview-table cascade-table shadow-sm">
                                                        <thead>
                                                            <tr><th>Serial Number</th><th>Status</th><th>Condition</th><th>Action</th></tr>
                                                        </thead>
                                                        <tbody>
                                                            {entry.stocks?.length > 0 ? entry.stocks.map((s, i) => (
                                                                <tr key={i}>
                                                                    <td><code>{s.serial_number}</code></td>
                                                                    <td><span className={`status-pill ${s.status === 'AVAILABLE' ? 'completed' : 'to-do'}`}>{s.status}</span></td>
                                                                    <td>{s.condition}</td>
                                                                    <td>
                                                                        <button
                                                                            className="review-btn"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setStockModalMode('edit');
                                                                                setStockFormData({
                                                                                    item_id: entry.id,
                                                                                    serial_number: s.serial_number,
                                                                                    status: s.status || 'AVAILABLE',
                                                                                    condition: s.condition || '',
                                                                                });
                                                                                setIsStockModalOpen(true);
                                                                            }}
                                                                            style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
                                                                        >
                                                                            Edit Stock
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            )) : <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>No serial numbers registered.</td></tr>}
                                                        </tbody>
                                                    </table>

                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
                                                        <button
                                                            className="reopen-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setStockModalMode('add');
                                                                setStockFormData({
                                                                    item_id: entry.id,
                                                                    serial_number: '',
                                                                    status: 'AVAILABLE',
                                                                    condition: '',
                                                                });
                                                                setIsStockModalOpen(true);
                                                            }}
                                                            style={{ margin: 0 }}
                                                        >
                                                            Add Stock
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* MODAL OVERLAY */}
            {activeModal && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal-container" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3 className="body-header-font3">{activeModal === 'add' ? "New Asset Registration" : "Modify Asset Details"}</h3>
                        </div>
                        <form onSubmit={handleSaveItem}>
                            <div className="modal-body">
                                <div className="description-body">
                                    <label>Display Name</label>
                                    <input
                                        type="text"
                                        className="text-box-editable"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />

                                    <label style={{ marginTop: '15px' }}>Description / Specs</label>
                                    <textarea
                                        className="text-box-editable"
                                        style={{ minHeight: '100px' }}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />

                                    {activeModal === 'add' && (
                                        <>
                                            <label style={{ marginTop: '15px' }}>Thumbnail Image</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => setFormData({ ...formData, file: e.target.files[0] })}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="reopen-btn" disabled={isProcessing}>
                                    {isProcessing ? "Processing..." : "Save Changes"}
                                </button>
                                <button type="button" className="cancel-btn" onClick={closeModals}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isStockModalOpen && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal-container" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3 className="body-header-font3">{stockModalMode === 'add' ? 'Add Stock' : 'Modify Stock Details'}</h3>
                        </div>
                        <form onSubmit={handleSaveStock}>
                            <div className="modal-body">
                                <div className="description-body">
                                    <label>Item ID</label>
                                    <input
                                        type="text"
                                        className="text-box-editable"
                                        readOnly
                                        value={stockFormData.item_id}
                                    />

                                    <label style={{ marginTop: '15px' }}>Serial Number</label>
                                    <input
                                        type="text"
                                        className="text-box-editable"
                                        readOnly={stockModalMode !== 'add'}
                                        required={stockModalMode === 'add'}
                                        value={stockFormData.serial_number}
                                        onChange={(e) => {
                                            if (stockModalMode !== 'add') return;
                                            setStockFormData({ ...stockFormData, serial_number: e.target.value });
                                        }}
                                    />

                                    <label style={{ marginTop: '15px' }}>Status</label>
                                    <select
                                        className="text-box-editable"
                                        value={stockFormData.status}
                                        onChange={(e) => setStockFormData({ ...stockFormData, status: e.target.value })}
                                    >
                                        <option value="AVAILABLE">AVAILABLE</option>
                                        <option value="BORROWED">BORROWED</option>
                                        <option value="FOR_REPAIR">FOR_REPAIR</option>
                                        <option value="DECOMMISSIONED">DECOMMISSIONED</option>
                                    </select>

                                    <label style={{ marginTop: '15px' }}>Condition</label>
                                    <input
                                        type="text"
                                        className="text-box-editable"
                                        required={stockModalMode === 'add'}
                                        value={stockFormData.condition}
                                        onChange={(e) => setStockFormData({ ...stockFormData, condition: e.target.value })}
                                    />
                                    {stockModalMode !== 'add' && (
                                        <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                                            *Reminder: Be careful when editing a stock's status — changing it incorrectly can cause data integrity issues.
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="reopen-btn" disabled={isProcessing}>
                                    {isProcessing ? "Processing..." : (stockModalMode === 'add' ? 'Add Stock' : 'Save Changes')}
                                </button>
                                <button type="button" className="cancel-btn" onClick={closeModals}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isImportModalOpen && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal-container" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3 className="body-header-font3">Import Item Stocks</h3>
                        </div>
                        <form onSubmit={handleImportStocks}>
                            <div className="modal-body">
                                <div className="description-body">
                                    <label>Spreadsheet File</label>
                                    <input
                                        type="file"
                                        accept=".csv,.xls,.xlsx"
                                        required
                                        onChange={e => setImportFormData({ ...importFormData, file: e.target.files?.[0] || null })}
                                    />
                                    <small style={{ marginTop: '10px', display: 'block', color: '#64748b' }}>
                                        Required columns: serial_number, status, condition
                                    </small>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="reopen-btn" disabled={isProcessing || !importFormData.file}>
                                    {isProcessing ? "Processing..." : "Import"}
                                </button>
                                <button type="button" className="cancel-btn" onClick={closeModals}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {errorModal.isOpen && (
                <ErrorMessage
                    subject={errorModal.subject}
                    message={errorModal.message}
                    onReturn={() => setErrorModal({ ...errorModal, isOpen: false })}
                />
            )}
        </div>
    );
};