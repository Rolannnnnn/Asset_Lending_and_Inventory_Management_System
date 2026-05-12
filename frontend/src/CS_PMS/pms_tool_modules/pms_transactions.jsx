import React, { useState, useEffect, useCallback } from 'react';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import '../../css_formats/global_body.css';

export function PMSTransactions({ user, handleLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);
  
  // Tab Management using your CSS classes
  const [activeTab, setActiveTab] = useState("PENDING");
  
  // Action States
  const [actionLoading, setActionLoading] = useState(false);
  const [declineTx, setDeclineTx] = useState(false);
  const [declineComment, setDeclineComment] = useState("");

  const API_BASE = `${CONFIG.ip}:${CONFIG.port}/transactions`;

  // Tab Categories mapped to your specific status constants
  const TABS = {
    PENDING: ["REQUEST_BORROW", "REQUEST_ISSUANCE"],
    "IN PROGRESS": ["ACCEPT_BORROW", "ACCEPT_ISSUANCE", "TRANSFERRED_TO_STUDENT"],
    COMPLETED: ["RETURNED", "TRANSFERRED_TO_PMS"],
    DECLINED: ["DECLINE_BORROW", "DECLINE_ISSUANCE"]
  };

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/get_all/`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleAction = async (endpoint, payload) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE}/${endpoint}/`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (response.ok) {
        await fetchTransactions();
        closeAllModals();
      } else {
        const errorData = await response.json();
        alert(errorData.detail?.message || "Action failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const closeAllModals = () => {
    setSelectedTx(null);
    setDeclineTx(false);
    setDeclineComment("");
  };

  const filteredTransactions = transactions.filter(tx => 
    TABS[activeTab].includes(tx.status)
  );

  return (
    <div className="main-dashboard-container">
      {/* TABS CONTAINER - Following your CSS .tabs-container and .tab-item */}
      <div className="tabs-container">
        {Object.keys(TABS).map((tabName) => {
          const count = transactions.filter(tx => TABS[tabName].includes(tx.status)).length;
          return (
            <div
              key={tabName}
              className={`tab-item ${activeTab === tabName ? 'active' : ''}`}
              onClick={() => setActiveTab(tabName)}
            >
              {tabName}
              <span className="tab-count">{count}</span>
            </div>
          );
        })}
      </div>

      <div className="ticket-list-header-container">
        {/* WRAPPER - Following your CSS .ticket-list-wrapper */}
        <div className="ticket-list-wrapper" style={{ gridColumn: "1 / -1" }}>
          {loading ? (
            <p className="p-4">Loading transactions...</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="p-4">No records found for {activeTab}.</p>
          ) : (
            <table className="overview-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Student Number</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="clickable-row" onClick={() => setSelectedTx(tx)}>
                    <td>#{tx.id}</td>
                    <td>{tx.student_number}</td>
                    <td>
                      <span className={`status-pill ${tx.status.toLowerCase().includes('decline') ? 'to-do' : 'completed'}`}>
                        {tx.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>{tx.stocks?.length || 0}</td>
                    <td><button className='review-btn' style={{margin: 0}}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedTx && (
        <div className="modal-overlay" onClick={closeAllModals}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="body-header-font3" style={{margin: 0}}>Transaction Details</h3>
            </div>
            <div className="modal-body">
              <div className="description-body">
                <label>Transaction ID</label>
                <input className="text-box-readonly" readOnly value={selectedTx.id} />
                
                <label>Student Number</label>
                <input className="text-box-readonly" readOnly value={selectedTx.student_number} />
                
                <label>Items</label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                  {selectedTx.stocks?.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span className="body-content-text3">{item.item_name}</span>
                      <span style={{ fontWeight: 'bold' }}>x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {selectedTx.status === "REQUEST_BORROW" && (
                <>
                  <button className="reopen-btn" onClick={() => handleAction('accept_borrow', { transaction_id: selectedTx.id, to_issuance: true })}>Accept</button>
                  <button className="assign-btn" onClick={() => setDeclineTx(true)}>Decline</button>
                </>
              )}
              {selectedTx.status === "REQUEST_ISSUANCE" && (
                <>
                  <button className="reopen-btn" onClick={() => handleAction('accept_issuance', { transaction_id: selectedTx.id })}>Approve</button>
                  <button className="assign-btn" onClick={() => setDeclineTx(true)}>Decline</button>
                </>
              )}
              {selectedTx.status === "TRANSFERRED_TO_STUDENT" && (
                <button className="update-btn" onClick={() => handleAction('return', { transaction_id: selectedTx.id })}>Mark Returned</button>
              )}
              <button className="cancel-btn" onClick={closeAllModals}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DECLINE MODAL */}
      {declineTx && (
        <div className="modal-overlay" onClick={() => setDeclineTx(false)} style={{ zIndex: 1100 }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{maxWidth: '450px'}}>
            <div className="modal-header"><h3 className="body-header-font3" style={{margin: 0}}>Confirm Decline</h3></div>
            <div className="modal-body">
              <div className="description-body">
                <label>Reason for Rejection</label>
                <textarea 
                  className="text-box-editable"
                  style={{ width: '100%', minHeight: '100px', borderRadius: '8px' }}
                  value={declineComment}
                  onChange={(e) => setDeclineComment(e.target.value)}
                  placeholder="Enter rejection details..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="assign-btn" 
                disabled={!declineComment.trim() || actionLoading}
                onClick={() => {
                  const endpoint = selectedTx.status === "REQUEST_BORROW" ? "decline_borrow" : "decline_issuance";
                  handleAction(endpoint, { transaction_id: selectedTx.id, comment: declineComment });
                }}
              >
                {actionLoading ? "Processing..." : "Confirm Decline"}
              </button>
              <button className="cancel-btn" onClick={() => setDeclineTx(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}