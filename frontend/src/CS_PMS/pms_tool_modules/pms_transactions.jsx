import React, { useState, useEffect, useCallback } from 'react';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import '../../css_formats/global_body.css';

const API_BASE = `${CONFIG.ip}:${CONFIG.port}/transactions`;

export function PMSTransactions({ user, handleLogout }) {
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

  // TAB DEFINITIONS
  const TABS = {
    ALL: [
      "REQUEST_BORROW",
      "REQUEST_ISSUANCE",
      "ACCEPT_BORROW",
      "ACCEPT_ISSUANCE",
      "TRANSFERRED_TO_STUDENT",
      "RETURNED",
      "TRANSFERRED_TO_PMS",
      "DECLINE_BORROW",
      "DECLINE_ISSUANCE"
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

  const closeAllModals = () => {
    setSelectedTx(null);
    setDeclineTx(false);
    setDeclineComment("");
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

      {/* DETAIL MODAL */}
      {selectedTx && (
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

              {/* REQUEST BORROW */}
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

              {/* REQUEST ISSUANCE */}
              {selectedTx.status === "REQUEST_ISSUANCE" && (
                <>
                  <button
                    className="reopen-btn"
                    disabled={actionLoading}
                    onClick={() =>
                      handleAction(
                        'accept_issuance',
                        {
                          transaction_id: selectedTx.id
                        }
                      )
                    }
                  >
                    Approve
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

                    const sns =
                      selectedTx.stocks.map(
                        s => s.serial_number
                      );

                    const stats =
                      selectedTx.stocks.map(
                        () => "AVAILABLE"
                      );

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
          style={{ zIndex: 1100 }}
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
                  onChange={(e) =>
                    setDeclineComment(e.target.value)
                  }
                  placeholder="Enter rejection details..."
                />

              </div>
            </div>

            <div className="modal-footer">

              <button
                className="assign-btn"
                disabled={
                  !declineComment.trim() ||
                  actionLoading
                }
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
                {actionLoading
                  ? "Processing..."
                  : "Confirm Decline"}
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