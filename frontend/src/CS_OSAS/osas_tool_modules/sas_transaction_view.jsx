import React, { useState, useEffect, useCallback } from 'react';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import '../../css_formats/global_body.css';

const API_BASE = `${CONFIG.ip}:${CONFIG.port}/transactions`;

export function OsasTransactionView({ user, handleLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);

  // PRIMARY TAB
  const [activeTab, setActiveTab] = useState("ALL");

  // SECONDARY SUBTAB
  const [activeSubTab, setActiveSubTab] = useState("ALL");

  // ACTION STATES
  const [actionLoading, setActionLoading] = useState(false);
  const [declineTx, setDeclineTx] = useState(false);
  const [declineComment, setDeclineComment] = useState("");

  // NESTED REVIEW MODAL STATES
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState("list"); // "list" or "stocks"
  const [detailedTx, setDetailedTx] = useState(null);
  const [modalFetchLoading, setModalFetchLoading] = useState(false);

  // TAB DEFINITIONS
  const TABS = {
    ALL: ["REQUEST_BORROW","REQUEST_ISSUANCE","ACCEPT_BORROW","ACCEPT_ISSUANCE", "TRANSFERRED_TO_STUDENT","RETURNED","TRANSFERRED_TO_PMS","DECLINE_BORROW","DECLINE_ISSUANCE"
    ],
    "REQUEST": [
      "REQUEST_BORROW",
      "REQUEST_ISSUANCE"
    ],
    "ACCEPTED": [
      "ACCEPT_BORROW",
      "ACCEPT_ISSUANCE",
      "TRANSFERRED_TO_STUDENT"
    ],
    COMPLETED: [
      "RETURNED",
      "TRANSFERRED_TO_PMS"
    ],
    DECLINED: [
      "DECLINE_BORROW",
      "DECLINE_ISSUANCE"
    ]
  };

  // DISPLAY LABELS
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

  // FETCH TRANSACTIONS
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/get_all/`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      console.log("FETCHED DATA:", data);

      if (response.ok) {
        setTransactions(data.transactions || []);
      } else {
        console.error("Fetch failed:", data);
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

  // RESET SUBTAB WHEN MAIN TAB CHANGES
  useEffect(() => {
    setActiveSubTab("ALL");
  }, [activeTab]);

  // ACTION HANDLER
  const handleAction = async (endpoint, payload) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE}/${endpoint}/`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
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

  // FETCH ONE FULL TRANSACTIONS TIMELINE (FOR REVIEW MODAL)
  const handleFetchFullDetails = async (transactionId) => {
    setModalFetchLoading(true);
    try {
      const response = await fetch(`${API_BASE}/get_one_full/`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transaction_id: transactionId }),
        credentials: "include"
      });
      const data = await response.json();
      
      if (response.ok) {
        setDetailedTx(data.transaction);
        setModalTab("list"); // Reset to list tab on load
        setIsReviewModalOpen(true);
      } else {
        alert(data.detail?.message || "Could not retrieve full timeline details.");
      }
    } catch (err) {
      console.error("Error fetching detailed tx:", err);
    } finally {
      setModalFetchLoading(false);
    }
  };

  const closeAllModals = () => {
    setSelectedTx(null);
    setDeclineTx(false);
    setDeclineComment("");
    setIsReviewModalOpen(false);
    setDetailedTx(null);
  };

  // CURRENT FILTER STATUSES
  const currentStatuses =
    activeSubTab === "ALL"
      ? TABS[activeTab]
      : [activeSubTab];

  // FILTERED DATA
  const filteredTransactions = transactions.filter(
    (tx) =>
      tx?.status &&
      currentStatuses.includes(tx.status)
  );

  return (
    <div className="main-dashboard-container">

      {/* MAIN TABS */}
      <div className="tabs-container">
        {Object.keys(TABS).map((tabName) => {
          const count = transactions.filter(
            (tx) =>
              tx?.status &&
              TABS[tabName].includes(tx.status)
          ).length;

          return (
            <div
              key={tabName}
              className={`tab-item ${activeTab === tabName ? 'active' : ''}`}
              onClick={() => setActiveTab(tabName)}
            >
              {tabName}
              <span className="tab-count">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* SUBTABS */}
      {activeTab !== "ALL" && (
        <div
          className="tabs-container"
          style={{
            marginTop: '10px',
            borderBottom: 'none',
            background: 'transparent'
          }}
        >
          {/* ALL SUBTAB */}
          <div
            className={`tab-item ${activeSubTab === "ALL" ? 'active' : ''}`}
            onClick={() => setActiveSubTab("ALL")}
            style={{
              fontSize: '0.8rem',
              padding: '5px 12px'
            }}
          >
            ALL
          </div>

          {/* INDIVIDUAL SUBTABS */}
          {TABS[activeTab].map((status) => {
            const subCount = transactions.filter(
              (tx) => tx?.status === status
            ).length;

            return (
              <div
                key={status}
                className={`tab-item ${activeSubTab === status ? 'active' : ''}`}
                onClick={() => setActiveSubTab(status)}
                style={{
                  fontSize: '0.8rem',
                  padding: '5px 12px'
                }}
              >
                {SUBTABS_MAP[status]}
                <span
                  className="tab-count"
                  style={{ fontSize: '10px' }}
                >
                  {subCount}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE */}
      <div className="ticket-list-header-container">
        <div
          className="ticket-list-wrapper"
          style={{ gridColumn: "1 / -1" }}
        >
          {loading ? (
            <p className="p-4">Loading transactions...</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="p-4">
              No records found for this category.
            </p>
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
                  <tr
                    key={tx.id}
                    className="clickable-row"
                    onClick={() => setSelectedTx(tx)}
                  >
                    <td>#{tx.id}</td>
                    <td>{tx.student_number}</td>
                    <td>
                      <span
                        className={`status-pill ${
                          tx.status.includes('DECLINE')
                            ? 'to-do'
                            : 'completed'
                        }`}
                      >
                        {tx.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>{tx.stocks?.length || 0}</td>
                    <td>
                      <button
                        className='review-btn'
                        style={{ margin: 0 }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* COMPREHENSIVE APPROVAL PREVIEW MODAL */}
      {isReviewModalOpen && detailedTx && (
        <div className="modal-overlay" onClick={closeAllModals} style={{ zIndex: 1200 }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            
            <div className="modal-header">
              <h3 className="body-header-font3" style={{ margin: 0 }}>
                Review Request Issuance Details #{detailedTx.id}
              </h3>
              <button 
                onClick={closeAllModals}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* INNER TWO-TAB INTERFACE */}
            <div className="tabs-container" style={{ background: '#f1f5f9', padding: '5px 10px 0 10px' }}>
              <div 
                className={`tab-item ${modalTab === 'list' ? 'active' : ''}`}
                onClick={() => setModalTab('list')}
                style={{ fontSize: '0.85rem', padding: '8px 16px' }}
              >
                History List
              </div>
              <div 
                className={`tab-item ${modalTab === 'stocks' ? 'active' : ''}`}
                onClick={() => setModalTab('stocks')}
                style={{ fontSize: '0.85rem', padding: '8px 16px' }}
              >
                Stocks Info
              </div>
            </div>

            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              
              {/* TAB 1: HISTORY TIMELINE CONTAINERS */}
              {modalTab === 'list' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '5px' }}>
                  
                  {/* Container 1: Borrow Request */}
                  <div style={{ border: '1px solid #e2e8f0', padding: '15px', borderRadius: '8px', background: '#f8fafc' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#2563eb', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                      Borrow Request
                    </h4>
                    <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <p style={{ margin: 0 }}><strong>Handled Personnel:</strong> {detailedTx.borrow_request?.personnel || detailedTx.student_number || 'N/A'}</p>
                      <p style={{ margin: 0 }}><strong>Date & Time:</strong> {detailedTx.borrow_request?.date_time || detailedTx.created_at || 'N/A'}</p>
                      <p style={{ margin: 0 }}><strong>Comment:</strong> {detailedTx.borrow_request?.comment || <em>None</em>}</p>
                    </div>
                  </div>

                  {/* Container 2: Accept Borrow Request */}
                  <div style={{ border: '1px solid #e2e8f0', padding: '15px', borderRadius: '8px', background: '#f8fafc' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#16a34a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                      Accept Borrow Request
                    </h4>
                    <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <p style={{ margin: 0 }}><strong>Handled Personnel:</strong> {detailedTx.accept_borrow?.personnel || 'N/A'}</p>
                      <p style={{ margin: 0 }}><strong>Date & Time:</strong> {detailedTx.accept_borrow?.date_time || 'N/A'}</p>
                      <p style={{ margin: 0 }}><strong>Comment:</strong> {detailedTx.accept_borrow?.comment || <em>None</em>}</p>
                    </div>
                  </div>

                  {/* Container 3: Request Issuance */}
                  <div style={{ border: '1px solid #e2e8f0', padding: '15px', borderRadius: '8px', background: '#f8fafc' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#ea580c', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                      Request Issuance
                    </h4>
                    <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <p style={{ margin: 0 }}><strong>Handled Personnel:</strong> {detailedTx.request_issuance?.personnel || 'N/A'}</p>
                      <p style={{ margin: 0 }}><strong>Date & Time:</strong> {detailedTx.request_issuance?.date_time || 'N/A'}</p>
                      <p style={{ margin: 0 }}><strong>Comment:</strong> {detailedTx.request_issuance?.comment || <em>None</em>}</p>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: STOCKS CONTENT CONTAINER */}
              {modalTab === 'stocks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '5px' }}>
                  <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 5px 0' }}>
                    Items tracked under this user session assignment allocation:
                  </p>
                  
                  {detailedTx.stocks && detailedTx.stocks.length > 0 ? (
                    detailedTx.stocks.map((stock, i) => (
                      <div 
                        key={i} 
                        style={{
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          background: '#fff',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 'bold', color: '#1e293b' }}>
                            {stock.item_name || "Unnamed Item Asset"}
                          </span>
                          <span style={{ color: '#2563eb', fontWeight: 'bold' }}>
                            {stock.quantity ? `Qty: x${stock.quantity}` : 'Qty: 1'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', color: '#64748b' }}>
                          <span><strong>Serial No:</strong> {stock.serial_number || 'N/A'}</span>
                          <span><strong>Initial Condition:</strong> {stock.condition_releasing || 'Pending'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                      No inventory distribution entries tracked for this block.
                    </p>
                  )}
                </div>
              )}

            </div>

            <div className="modal-footer">
              <button
                className="reopen-btn"
                disabled={actionLoading}
                onClick={() =>
                  handleAction('accept_issuance', {
                    transaction_id: detailedTx.id
                  })
                }
              >
                {actionLoading ? "Processing Approval..." : "Confirm & Approve"}
              </button>
              <button className="cancel-btn" onClick={closeAllModals}>
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CORE BASE CONFIG DETAIL MODAL */}
      {selectedTx && !isReviewModalOpen && (
        <div
          className="modal-overlay"
          onClick={closeAllModals}
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3
                className="body-header-font3"
                style={{ margin: 0 }}
              >
                Transaction Details
              </h3>
            </div>

            <div className="modal-body">
              <div className="description-body">
                <label>Transaction ID</label>
                <input
                  className="text-box-readonly"
                  readOnly
                  value={selectedTx.id || ""}
                />

                <label>Student Number</label>
                <input
                  className="text-box-readonly"
                  readOnly
                  value={selectedTx.student_number || ""}
                />

                <label>Inventory Items</label>
                <div
                  style={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    background: 'var(--container-bg)',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd'
                  }}
                >
                  {selectedTx.stocks?.map((stock, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '5px'
                      }}
                    >
                      <span className="body-content-text3">
                        {stock.item_name || stock.serial_number}
                      </span>
                      <span style={{ fontWeight: 'bold' }}>
                        {stock.quantity
                          ? `x${stock.quantity}`
                          : stock.condition_releasing || "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {/* REQUEST BORROW ACTIONS */}
              {selectedTx.status === "REQUEST_BORROW" && (
                <>
                  <button
                    className="reopen-btn"
                    disabled={actionLoading}
                    onClick={() =>
                      handleAction(
                        'accept_borrow',
                        {
                          transaction_id: selectedTx.id,
                          to_issuance: true
                        }
                      )
                    }
                  >
                    Accept
                  </button>
                  <button
                    className="assign-btn"
                    disabled={actionLoading}
                    onClick={() => setDeclineTx(true)}
                  >
                    Decline
                  </button>
                </>
              )}

              {/* REQUEST ISSUANCE ACTIONS -> NOW TRIGGERS STEPPED REVIEW MODAL */}
              {selectedTx.status === "REQUEST_ISSUANCE" && (
                <>
                  <button
                    className="reopen-btn"
                    disabled={actionLoading || modalFetchLoading}
                    onClick={() => handleFetchFullDetails(selectedTx.id)}
                  >
                    {modalFetchLoading ? "Loading Timeline..." : "Approve"}
                  </button>
                  <button
                    className="assign-btn"
                    disabled={actionLoading}
                    onClick={() => setDeclineTx(true)}
                  >
                    Decline
                  </button>
                </>
              )}

              {/* TRANSFERRED */}
              {selectedTx.status === "TRANSFERRED_TO_STUDENT" && (
                <button
                  className="update-btn"
                  disabled={actionLoading}
                  onClick={() =>
                    handleAction(
                      'return',
                      {
                        transaction_id: selectedTx.id
                      }
                    )
                  }
                >
                  Mark Returned
                </button>
              )}

              {/* RETURNED */}
              {selectedTx.status === "RETURNED" && (
                <button
                  className="update-btn"
                  disabled={actionLoading}
                  onClick={() => {
                    const sns = selectedTx.stocks.map(s => s.serial_number);
                    const stats = selectedTx.stocks.map(() => "AVAILABLE");
                    handleAction(
                      'transfer_to_pms',
                      {
                        transaction_id: selectedTx.id,
                        custom_condition_sn: sns,
                        custom_condition_status: stats
                      }
                    );
                  }}
                >
                  Confirm Transfer to PMS
                </button>
              )}

              <button
                className="cancel-btn"
                onClick={closeAllModals}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DECLINE MODAL */}
      {declineTx && (
        <div
          className="modal-overlay"
          onClick={() => setDeclineTx(false)}
          style={{ zIndex: 1300 }}
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '450px' }}
          >
            <div className="modal-header">
              <h3
                className="body-header-font3"
                style={{ margin: 0 }}
              >
                Confirm Decline
              </h3>
            </div>

            <div className="modal-body">
              <div className="description-body">
                <label>Reason for Rejection</label>
                <textarea
                  className="text-box-editable"
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    borderRadius: '8px'
                  }}
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
                  const endpoint =
                    selectedTx.status === "REQUEST_BORROW"
                      ? "decline_borrow"
                      : "decline_issuance";

                  handleAction(
                    endpoint,
                    {
                      transaction_id: selectedTx.id,
                      comment: declineComment
                    }
                  );
                }}
              >
                {actionLoading ? "Processing..." : "Confirm Decline"}
              </button>
              <button
                className="cancel-btn"
                onClick={() => setDeclineTx(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

