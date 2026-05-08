import React, { useEffect, useState } from 'react';
import CONFIG from '../../tool_modules/FETCH_IP.json';

export const OsasTransactionView = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);



    const fetchList = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${CONFIG.ip}:${CONFIG.port}/transactions/get_all/?logged=1`);
            if (res.ok) {
            
            const data = await res.json();
            setTransactions(data.transactions || []);
            } else {
                console.error("Failed to fetch transactions:", res.statusText);
                alert("Failed to load transactions. Please try again later.");
            }
        } catch (error) {
            console.error("Fetch List Error:", error);
            alert("Could not load transactions. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {fetchList()}, []);

       const handleReviewClick = async (id) => {
        try {
            const res = await fetch(`${CONFIG.ip}:${CONFIG.port}/transactions/get_detailed/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transaction_id: id })
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedTransaction(data.transaction);
                setIsModalOpen(true);
            } else {
                console.error("Failed to fetch transaction details:", res.statusText);
                alert("Failed to load transaction details. Please try again later.");
            }
        } catch (error) {
            console.error("Fetch Transaction Details Error:", error);
            alert("Could not load transaction details. Please check your connection.");
        }
    };
   return (
        <div className="overall-items-container">
            <div className="inventory-list-header">
                <span>Student #</span>
                <span>Item Info</span>
                <span>Status</span>
                <span>Action</span>
            </div>
            
            {loading ? (
                <div className="placeholder-card"><p>Loading...</p></div>
            ) : (
                transactions.map(t => (
                    <div key={t.id} className="item-main-row">
                        <span>{t.student_number}</span>
                        <span>Item ID: {t.item_id}</span>
                        <span className={`status-pill ${t.status.toLowerCase().replace('_', '-')}`}>
                            {t.status}
                        </span>
                        <button 
                            className="text-link" 
                            onClick={() => handleReviewClick(t.id)}
                            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                        >
                            Review
                        </button>
                    </div>
                ))
            )}

            {isModalOpen && (
                <TransactionModal 
                    data={selectedTransaction} 
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedTransaction(null);
                    }}
                    refresh={fetchList}
                />
            )}
        </div>
    );
};


const TransactionModal = ({ data, onClose, refresh }) => {
    if (!data) return null;

    const handleAction = async (actionType) => {
        const endpoint = actionType === 'ACCEPT' ? '/accept_borrow/' : '/decline_borrow/';
        const payload = actionType === 'ACCEPT' 
            ? { transaction_id: data.id, to_issuance: true }
            : { transaction_id: data.id, comment: "Approved by OSAS" };

        try {
            const res = await fetch(`${CONFIG.ip}:${CONFIG.port}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(`Request successfully ${actionType.toLowerCase()}ed.`);
                refresh(); // Re-fetches the main list
                onClose(); // Closes the modal
            } else {
                alert("Failed to process action.");
            }
        } catch (error) {
            console.error("Action Error:", error);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="student-id-card" style={{ width: '500px', maxWidth: '90vw' }}>
                <div className="id-card-header">
                    <p className="id-card-name">Detailed Review: #{data.id}</p>
                </div>
                
                <div className="id-card-grid">
                    <div className="id-data-field">
                        <span className="id-label">Student Name</span>
                        <span className="id-value">{data.student_name}</span>
                    </div>
                    <div className="id-data-field">
                        <span className="id-label">Course & Section</span>
                        <span className="id-value">{data.student_course} - {data.student_section}</span>
                    </div>
                    <div className="id-data-field">
                        <span className="id-label">Equipment</span>
                        <span className="id-value">{data.item_name} (Qty: {data.quantity})</span>
                    </div>
                    <div className="id-data-field">
                        <span className="id-label">Handled By</span>
                        <span className="id-value">{data.sas_name || "Pending"}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                    <button 
                        onClick={() => handleAction('ACCEPT')}
                        className="btn-primary" 
                        style={{ backgroundColor: '#06bf72', flex: 1 }}
                    >
                        Accept
                    </button>
                    <button 
                        onClick={() => handleAction('DECLINE')}
                        className="btn-primary" 
                        style={{ backgroundColor: '#740A03', flex: 1 }}
                    >
                        Decline
                    </button>
                </div>
                
                <button onClick={onClose} style={{ 
                    marginTop: '15px', 
                    width: '100%', 
                    background: 'none', 
                    border: '1px solid #ddd', 
                    padding: '8px',
                    borderRadius: '6px',
                    cursor: 'pointer' 
                }}>
                    Cancel
                </button>
            </div>
        </div>
    );
};
