import React, { useState, useEffect, useCallback } from 'react';
import { ErrorMessage } from '../../tool_modules/error_message.jsx';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import { LoadingPage } from '../../tool_modules/loading_page.jsx';

import newItemIcon from '../../assets/new_item_icon.svg';
import exportStockIcon from '../../assets/export_stock_icon.svg';
import editDetailsIcon from '../../assets/edit_details_icon.svg';
import activateOnIcon from '../../assets/activate_on_icon.svg';
import activateOffIcon from '../../assets/activate_off_icon.svg';
import uploadImageIcon from '../../assets/upload_image_icon.svg';
import updateImageIcon from '../../assets/update_image_icon.svg';

const API_BASE = `${CONFIG.ip}:${CONFIG.port}/items`;

export const AdminOverallItemsOverview = () => {


    // Export a single stock for a given item
    const handleExportSingleStock = (itemId, serialNumber) => {
        const item = inventory.find(i => i.id === itemId);
        if (!item || !item.stocks) {
            triggerError("Export Failed", "No stock data available to export.");
            return;
        }
        const stock = item.stocks.find(s => s.serial_number === serialNumber);
        if (!stock) {
            triggerError("Export Failed", "Selected stock not found.");
            return;
        }
        const headers = ["Serial Number", "Status", "Condition"];
        const row = [
            `"${stock.serial_number}"`,
            stock.status,
            `"${stock.condition || ""}"`
        ];
        const csvContent = [headers.join(","), row.join(",")].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `stock_${item.name.replace(/\s+/g, '_')}_${stock.serial_number}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [inventory, setInventory] = useState([]);
    const [expandedItem, setExpandedItem] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const [activeModal, setActiveModal] = useState(null);
    const [formData, setFormData] = useState({ id: null, name: '', description: '', file: null });
    const [importFormData, setImportFormData] = useState({ item_id: null, file: null });
    const [exportFormData, setExportFormData] = useState({ file: null });



    const [statusConfirmModal, setStatusConfirmModal] = useState({ isOpen: false, itemId: null, currentActive: false });
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [stockModalMode, setStockModalMode] = useState('edit');
    const [stockFormData, setStockFormData] = useState({ item_id: '', serial_number: '', status: 'AVAILABLE', condition: '' });
    const [errorModal, setErrorModal] = useState({ isOpen: false, subject: "", message: "" });

    const [dataModal, setDataModal] = useState(null);

    // Export all stocks for all items
    const handleExportAllStocks = () => {
        // Gather all stocks from all items
        let allStocks = [];
        inventory.forEach(item => {
            if (item.stocks && item.stocks.length > 0) {
                item.stocks.forEach(stock => {
                    allStocks.push({
                        item_id: item.id || "",
                        item_name: item.name,
                        serial_number: stock.serial_number,
                        status: stock.status,
                        condition: stock.condition || ""
                    });
                });
            }
        });
        if (allStocks.length === 0) {
            triggerError("Export Failed", "No stock data available to export.");
            return;
        }
        // Define CSV headers
        const headers = ["Item ID", "Item Name", "Serial Number", "Status", "Condition"];
        const rows = allStocks.map(s => [
            `"${s.item_id}"`,
            `"${s.item_name}"`,
            `"${s.serial_number}"`,
            s.status,
            `"${s.condition}"`
        ]);
        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `all_stocks_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExport = (item) => {
        if (!item.stocks || item.stocks.length === 0) {
            triggerError("Export Failed", `No stock data available for ${item.name}.`);
            return;
        }

        // Define Headers
        const headers = ["Serial Number", "Status", "Condition"];

        // Map rows for this specific item
        const rows = item.stocks.map(s => [
            `"${s.serial_number || ""}"`,
            s.status || "N/A",
            `"${s.condition || ""}"`
        ]);

        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `stocks_${item.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    const closeModals = () => {
        setDataModal(null);
        setActiveModal(null);
        setFormData({ id: null, name: '', description: '', file: null });

        setIsImportModalOpen(false);
        setImportFormData({ item_id: null, file: null });

        setIsExportModalOpen(false);
        setExportFormData({ file: null });

        setIsStockModalOpen(false);
        setStockModalMode('edit');
        setStockFormData({ item_id: '', serial_number: '', status: 'AVAILABLE', condition: '' });
        setStatusConfirmModal({ isOpen: false, itemId: null, currentActive: false });
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

    const openStatusConfirmModal = (itemId, currentActive) => {
        setStatusConfirmModal({ isOpen: true, itemId, currentActive });
    };

    const confirmStatusToggle = async () => {
        if (statusConfirmModal.itemId === null) return;

        const { itemId, currentActive } = statusConfirmModal;
        setStatusConfirmModal({ isOpen: false, itemId: null, currentActive: false });
        await handleToggleStatus(itemId, currentActive);
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
            const response = await fetch(`${API_BASE}/import/`, {
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
        <div className="body-main-content" style={{ borderRadius: '12px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div className="body-header-font" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-start', width: '100%', fontWeight: 600 }}>
                    Inventory Control

                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', width: '100%' }}>

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

                    <button className="review-btn"
                        onClick={handleExportAllStocks}
                        style={{
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <img src={exportStockIcon} alt="" style={{ width: '16px', height: '16px' }} />
                        Export All Stocks
                    </button>
                </div>

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
                                                                    openStatusConfirmModal(entry.id, isActive);
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
                                                                    setDataModal(entry);
                                                                }}
                                                                style={{ margin: 0 }}
                                                            >
                                                                Import/Export Stocks
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
                                                                    <td style={{ display: 'flex', gap: '8px' }}>
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

            {dataModal && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="edit-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="edit-modal-header">
                            <h2 className="edit-modal-title">Management: {dataModal.name}</h2>
                            <button className="edit-modal-close" onClick={closeModals}>&times;</button>
                        </div>

                        <div className="edit-form-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <button
                                className="reopen-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setImportFormData({ item_id: dataModal.id, file: null });
                                    setIsImportModalOpen(true);
                                    setDataModal(null);
                                }}
                            >
                                Import Stocks
                            </button>

                            <button
                                className="update-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleExport(dataModal);
                                }}
                            >
                                Export Stocks
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

            {statusConfirmModal.isOpen && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal-container" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '460px' }}>
                        <div className="modal-header" style={{ backgroundColor: '#740A03', borderBottom: '1px solid #5f0802' }}>
                            <h3 className="body-header-font3" style={{ color: '#fff', margin: 0 }}>Confirm Status Change</h3>
                        </div>
                        <div className="modal-body">
                            <div className="description-body">
                                <p style={{ margin: 0, lineHeight: 1.6 }}>
                                    Are you sure you want to {statusConfirmModal.currentActive ? 'deactivate' : 'activate'} this item?
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="reopen-btn"
                                onClick={confirmStatusToggle}
                                disabled={isProcessing}
                                style={{ margin: 0 }}
                            >
                                {isProcessing ? "Processing..." : "OK"}
                            </button>
                            <button type="button" className="cancel-btn" onClick={closeModals} disabled={isProcessing}>
                                Cancel
                            </button>
                        </div>
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
