import React, { useState, useEffect } from 'react';
import { ErrorMessage } from '../../tool_modules/error_message.jsx';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import { LoadingPage } from '../../tool_modules/loading_page.jsx';


export const OsasOverallItemsOverview = () => {
    const [inventory, setInventory] = useState([]);
    const [expandedItem, setExpandedItem] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorModal, setErrorModal] = useState({ isOpen: false, subject: "", message: "" });
    const closeErrorModal = () => setErrorModal({ ...errorModal, isOpen: false });


    const toggleExpand = (itemId) => {
        setExpandedItem(expandedItem === itemId ? null : itemId);
    };
    
    
    const fetchInventory = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/items/get_all_full`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setInventory(data);
            } else {
                setErrorModal({
                    isOpen: true,
                    subject: data.detail?.subject || "Error fetching inventory",
                    message: data.detail?.message || "Failed to fetch inventory data."
                }); 
            }
        } catch (error) {
            setErrorModal({
                isOpen: true,
                subject: "Error fetching inventory",
                message: error.message
            });
        } finally {
            setIsLoading(false);
        }
    };
    const handleStatusChange = async (itemId, serialNumber, newStatus) => {   
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/items/edit_stock/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    item_id: itemId,
                    serial_number: serialNumber,
                    status: newStatus,
                    condition: "Updated via Dashboard" // comment for status changing (optional)
                })
            });
            const data = await response.json();
            if (response.ok) {
                fetchInventory(); 
            } else {
                setErrorModal({
                    isOpen: true,
                    subject: data.detail?.subject || "Error updating unit status",
                    message: data.detail?.message || "Failed to update unit status."
                });
            }
        } catch (error) {
            setErrorModal({
                isOpen: true,
                subject: "Error updating unit status",
                message: error.message
            });
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);
    
    if (isLoading) {
        return <div className="loading-state"><p>Loading inventory...</p></div>;
    }

    return (
        <div className="overall-items-container">
            <div className="inventory-list-header">
                <span className="col-name">Item Name</span>
                <span className="col-desc">Description</span>
                <span className="col-stock">Total Units</span>
            </div>

            {inventory.map(entry => (
                /* entry represents the FullItem dataclass from your Python code */
                <div key={entry.item.id} className="inventory-group">
                    <div className="item-main-row" onClick={() => toggleExpand(entry.item.id)}>
                        <span className="col-name">{entry.item.name}</span>
                        <span className="col-desc">{entry.item.description}</span>
                        <span className="col-stock">{entry.stocks.length}</span>
                    </div>

                    {/* Expandable Table for Stocks */}
                    {expandedItem === entry.item.id && (
                        <div className="unit-details-dropdown">
                            <table className="unit-table">
                                <thead>
                                    <tr>
                                        <th>Serial Number</th>
                                        <th>Status</th>
                                        <th>Condition</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entry.stocks.map(stock => (
                                        <tr key={stock.serial_number}>
                                            <td>{stock.serial_number}</td>
                                            <td>
                                                <span className={`status-pill ${stock.status.toLowerCase().replace(" ", "-")}`}>
                                                    {stock.status}
                                                </span>
                                            </td>
                                            <td>{stock.condition}</td>
                                            <td>
                                                {stock.status === "AVAILABLE" ? (
                                                    <select 
                                                        onChange={(e) => handleStatusChange(entry.item.id, stock.serial_number, e.target.value)}
                                                        className="status-select"
                                                        defaultValue={stock.status}
                                                    >
                                                        <option value="AVAILABLE">Available</option>
                                                        <option value="FOR REPAIR">For Repair</option>
                                                        <option value="DECOMMISSIONED">Decommission</option>
                                                    </select>
                                                ) : (
                                                    <small>Locked</small>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};