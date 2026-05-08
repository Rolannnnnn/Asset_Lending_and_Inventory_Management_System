import React, { useState } from 'react';

export const OsasOverallItemsOverview = () => {
    // 1. Updated Data Structure: Each item now has an array of 'units'
    const [inventory, setInventory] = useState([
        {
            id: 1, name: "Projector", category: "Electronics",
            units: [
                { serial: "PRJ-001", status: "AVAILABLE" },
                { serial: "PRJ-002", status: "BORROWED" },
                { serial: "PRJ-003", status: "FOR REPAIR" },
            ]
        },
        {
            id: 2, name: "Laptop Charger", category: "Electronics",
            units: [
                { serial: "CHG-001", status: "AVAILABLE" },
                { serial: "CHG-002", status: "DECOMMISSIONED" },
            ]
        }
    ]);

    const [expandedItem, setExpandedItem] = useState(null);

    const toggleExpand = (itemId) => {
        setExpandedItem(expandedItem === itemId ? null : itemId);
    };

    const handleStatusChange = (itemId, serial, newStatus) => {
        setInventory(prev => prev.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    units: item.units.map(unit => 
                        unit.serial === serial ? { ...unit, status: newStatus } : unit
                    )
                };
            }
            return item;
        }));
    };

    return (
        <div className="overall-items-container">
    {/* This now has the Maroon background and White text */}
    <div className="inventory-list-header">
        <span className="col-name">Item Name</span>
        <span className="col-cat">Category</span>
        <span className="col-stock">Total Units</span>
    </div>

    {inventory.map(item => (
        <div key={item.id} className="inventory-group">
            <div className="item-main-row" onClick={() => toggleExpand(item.id)}>
                <span className="col-name">{item.name}</span>
                <span className="col-cat">{item.category}</span>
                <span className="col-stock">{item.units.length}</span>
            </div>

                    {/* Expandable Unit List */}
                    {expandedItem === item.id && (
                        <div className="unit-details-dropdown">
                            <table className="unit-table">
                                <thead>
                                    <tr>
                                        <th>Serial/Tag</th>
                                        <th>Current Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {item.units.map(unit => (
                                        <tr key={unit.serial}>
                                            <td>{unit.serial}</td>
                                            <td>
                                                <span className={`status-pill ${unit.status.replace(" ", "-").toLowerCase()}`}>
                                                    {unit.status}
                                                </span>
                                            </td>
                                            <td>
                                                {/* Logic: Only show dropdown if current status is AVAILABLE */}
                                                {unit.status === "AVAILABLE" ? (
                                                    <select 
                                                        onChange={(e) => handleStatusChange(item.id, unit.serial, e.target.value)}
                                                        className="status-select"
                                                    >
                                                        <option value="AVAILABLE">Available</option>
                                                        <option value="FOR REPAIR">For Repair</option>
                                                        <option value="DECOMMISSIONED">Decommission</option>
                                                    </select>
                                                ) : (
                                                    <small style={{color: '#888'}}>Status Locked</small>
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