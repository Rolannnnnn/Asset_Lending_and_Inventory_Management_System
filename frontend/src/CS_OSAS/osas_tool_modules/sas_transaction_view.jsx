import React, { useState, useEffect, useCallback } from 'react';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import '../../css_formats/global_body.css';

const API_BASE = `${CONFIG.ip}:${CONFIG.port}/transactions`;

export function OsasTransactionView({ user, handleLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);

  const [activeTab, setActiveTab] = useState("ALL");
  const [activeSubTab, setActiveSubTab] = useState("ALL");

  const [actionLoading, setActionLoading] = useState(false);
  const [declineTx, setDeclineTx] = useState(false);
  const [declineComment, setDeclineComment] = useState("");

  // UPDATED TABS DEFINITION
  const TABS = {
    ALL: ["REQUEST_BORROW", "REQUEST_ISSUANCE", "ACCEPT_BORROW", "ACCEPT_ISSUANCE", "TRANSFERRED_TO_STUDENT", "TRANSFERRED_TO_PMS", "DECLINE_BORROW",],

    "REQUEST": ["REQUEST_BORROW", "ACCEPT_BORROW"],

    "REQUESTED ISSUANCE": ["REQUEST_ISSUANCE"],
    "FOR TRANSFER": ["ACCEPT_ISSUANCE"],
    "ON STUDENT": ["TRANSFERRED_TO_STUDENT"],

    "COMPLETED": ["TRANSFERRED_TO_PMS", "DECLINE_BORROW"]
  };

  const SUBTABS_MAP = {
    REQUEST_BORROW: "REQUEST BORROW",
    REQUEST_ISSUANCE: "REQUEST ISSUANCE",
    ACCEPT_BORROW: "ACCEPT BORROW",
    ACCEPT_ISSUANCE: "ACCEPT ISSUANCE",
    TRANSFERRED_TO_STUDENT: "TRANSFERRED TO STUDENT",
    RETURNED: "RETURNED",
    TRANSFERRED_TO_PMS: "TRANSFERRED TO PMS",
    DECLINE_BORROW: "DECLINE BORROW",
    DECLINE_ISSUANCE: "DECLINE ISSUANCE"
  };

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
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
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    setActiveSubTab("ALL");
  }, [activeTab]);

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
      console.error("Action error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const closeAllModals = () => {
    setSelectedTx(null);
    setDeclineTx(false);
    setDeclineComment("");
  };

  const currentStatuses = activeSubTab === "ALL" ? TABS[activeTab] : [activeSubTab];

  const filteredTransactions = transactions.filter(tx =>
    tx?.status && currentStatuses.includes(tx.status)
  );

  const shouldShowSubTabs = activeTab !== "ALL" && TABS[activeTab].length > 1;

  return (
    <div className="main-dashboard-container">
      {/* MAIN TABS */}
      <div className="tabs-container">
        {Object.keys(TABS).map((tabName) => {
          const count = transactions.filter(tx =>
            tx?.status && TABS[tabName].includes(tx.status)
          ).length;
          return (
            <div
              key={tabName}
              className={`tab-item ${activeTab === tabName ? 'active' : ''}`}
              onClick={() => setActiveTab(tabName)}
            >
              {tabName} <span className="tab-count">{count}</span>
            </div>
          );
        })}
      </div>

      {/* SUBTABS - Conditionally rendered based on status count */}
      {shouldShowSubTabs && (
        <div className="tabs-container" style={{ marginTop: '10px', borderBottom: 'none', background: 'transparent' }}>
          <div
            className={`tab-item ${activeSubTab === "ALL" ? 'active' : ''}`}
            onClick={() => setActiveSubTab("ALL")}
            style={{ fontSize: '0.8rem', padding: '5px 12px' }}
          >
            ALL
          </div>
          {TABS[activeTab].map((status) => {
            const subCount = transactions.filter(tx => tx?.status === status).length;
            return (
              <div
                key={status}
                className={`tab-item ${activeSubTab === status ? 'active' : ''}`}
                onClick={() => setActiveSubTab(status)}
                style={{ fontSize: '0.8rem', padding: '5px 12px' }}
              >
                {SUBTABS_MAP[status]}
                <span className="tab-count" style={{ fontSize: '10px' }}>{subCount}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE */}
      <div className="ticket-list-header-container">
        <div className="ticket-list-wrapper" style={{ gridColumn: "1 / -1" }}>
          {loading ? (
            <p className="p-4">Loading transactions...</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="p-4">No records found for this category.</p>
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
                      <span className={`status-pill ${tx.status.includes('DECLINE') ? 'to-do' : 'completed'}`}>
                        {tx.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>{tx.stocks?.length || 0}</td>

                    <td>
                      {tx.status === "REQUEST_BORROW" && (
                        <button className='review-btn' style={{ margin: 0 }}>
                          Review
                        </button>
                      )}

                      {tx.status === "ACCEPT_BORROW" && (
                        <button className='review-btn' style={{ margin: 0 }}>
                          Request Issuance
                        </button>
                      )}

                      {tx.status === "REQUEST_ISSUANCE" && (
                        <button className='review-btn' style={{ margin: 0 }}>
                          View
                        </button>
                      )}

                      {tx.status === "ACCEPT_ISSUANCE" && (
                        <button className='review-btn' style={{ margin: 0 }}>
                          Transfer
                        </button>
                      )}

                      {tx.status === "TRANSFERRED_TO_STUDENT" && (
                        <button className='review-btn' style={{ margin: 0 }}>
                          Returned
                        </button>
                      )}

                      {tx.status === "TRANSFERRED_TO_PMS" && (
                        <button className='review-btn' style={{ margin: 0 }}>
                          View
                        </button>
                      )}


                      {tx.status === "DECLINE_BORROW" && (
                        <button className='review-btn' style={{ margin: 0 }}>
                          View
                        </button>
                      )}
                    </td>
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
              <h3 className="body-header-font3" style={{ margin: 0 }}>Transaction Details</h3>
            </div>
            <div className="modal-body">
              <div className="description-body">
                <label>Transaction ID: <input className="text-box-show" value={selectedTx.id || ""} /> </label>
                <label>Student Number: <input className="text-box-show" value={selectedTx.student_number || ""} /></label>
                
                <label>Inventory Items</label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'var(--container-bg)', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                        <th style={{ paddingBottom: '8px' }} className="body-content-text3">Item / Serial</th>
                        <th style={{ paddingBottom: '8px', textAlign: 'right' }} className="body-content-text3">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTx.stocks?.map((stock, i) => (
                        <tr key={i} style={{ borderBottom: i !== selectedTx.stocks.length - 1 ? '1px solid #f9f9f9' : 'none' }}>
                          <td style={{ py: '8px', textAlign: 'left' }} className="body-content-text3">
                            {stock.item_name || stock.serial_number}
                          </td>
                          <td style={{ py: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                            {stock.quantity ? `x${stock.quantity}` : (stock.condition_releasing || "Pending")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {selectedTx.status === "REQUEST_BORROW" && (
                <>
                  <button className="reopen-btn" disabled={actionLoading} onClick={() => handleAction('accept_borrow', { transaction_id: selectedTx.id, to_issuance: true })}>Accept</button>
                  <button className="assign-btn" disabled={actionLoading} onClick={() => setDeclineTx(true)}>Decline</button>
                </>
              )}

              {selectedTx.status === "ACCEPT_BORROW" && (
                <>
                  <button className="reopen-btn">Request Issuance</button>
                </>
              )}

              {selectedTx.status === "REQUEST_ISSUANCE" && (
                <span className="description-body label">Just for Viewing</span>
              )}

              {selectedTx.status === "ACCEPT_ISSUANCE" && (
                <>
                  <button className="reopen-btn">Transfer</button>
                </>
              )}

              {selectedTx.status === "TRANSFERRED_TO_STUDENT" && (
                <button className="update-btn" disabled={actionLoading} onClick={() => handleAction('return', { transaction_id: selectedTx.id })}>Mark Returned</button>
              )}

              {selectedTx.status === "TRANSFERRED_TO_PMS" && (
                <span className="description-body label">Just for Viewing</span>
              )}




              {selectedTx.status === "RETURNED" && (
                <button className="update-btn" disabled={actionLoading} onClick={() => {
                  const sns = selectedTx.stocks.map(s => s.serial_number);
                  const stats = selectedTx.stocks.map(() => "AVAILABLE");
                  handleAction('transfer_to_pms', { transaction_id: selectedTx.id, custom_condition_sn: sns, custom_condition_status: stats });
                }}>Confirm Transfer to PMS</button>
              )}

              <button className="cancel-btn" onClick={closeAllModals}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DECLINE MODAL */}
      {declineTx && (
        <div className="modal-overlay" onClick={() => setDeclineTx(false)} style={{ zIndex: 1100 }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header"><h3 className="body-header-font3" style={{ margin: 0 }}>Confirm Decline</h3></div>
            <div className="modal-body">
              <div className="description-body">
                <label>Reason for Rejection</label>
                <textarea className="text-box-editable" style={{ width: '100%', minHeight: '100px', borderRadius: '8px' }} value={declineComment} onChange={(e) => setDeclineComment(e.target.value)} placeholder="Enter rejection details..." />
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