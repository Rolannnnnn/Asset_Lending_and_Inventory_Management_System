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

  // MODAL STATES BRIDGED FROM OSAS SYSTEM
  const [detailedTx, setDetailedTx] = useState(null);
  const [modalFetchLoading, setModalFetchLoading] = useState(false);
  const [transferConfirmToPMSTx, setTransferConfirmToPMSTx] = useState(null);

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

    REQUEST: [
      "REQUEST_BORROW",
      "REQUEST_ISSUANCE"
    ],

    ACCEPTED: [
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

  // FULL DETAIL FETCH SYSTEM (Resolves stock mismatches & maps tracking status structural properties)
  const handleFetchFullDetails = async (transactionId) => {
    setModalFetchLoading(true);

    try {
      const [txRes, stockRes] = await Promise.all([
        fetch(`${API_BASE}/get_one_full/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transaction_id: transactionId }),
          credentials: "include"
        }),
        fetch(`${API_BASE}/get_stock/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transaction_id: transactionId }),
          credentials: "include"
        })
      ]);

      const txData = await txRes.json();
      if (!txRes.ok) {
        alert(txData.detail?.message || "Failed to fetch transaction details.");
        return null;
      }

      let stockConditions = [];
      if (stockRes.ok) {
        const stockData = await stockRes.json();
        stockConditions = stockData.stocks || [];
      }

      const originalStocks = txData.transaction?.stocks || [];
      const normalizeSerial = (value) => String(value ?? "").trim().toUpperCase();

      const stockBySerial = new Map(
        stockConditions
          .filter((s) => s?.serial_number)
          .map((s) => [normalizeSerial(s.serial_number), s])
      );

      const mergedStocks = originalStocks.map((stock) => {
        const serial = normalizeSerial(stock?.serial_number);
        const matchedStock = stockBySerial.get(serial);

        return {
          ...stock,
          item_name: txData.transaction?.item_name,
          item_id: matchedStock?.item_id ?? txData.transaction?.item_id,
          stock_status: matchedStock?.status,
          condition_current: matchedStock?.condition ?? null,
          condition_releasing: stock?.condition_releasing ?? matchedStock?.condition ?? null,
          pms_status: "" // Dropdown state starts empty for forced selection
        };
      });

      const mergedTransaction = {
        ...txData.transaction,
        stocks: mergedStocks
      };

      setDetailedTx(mergedTransaction);
      return mergedTransaction;

    } catch (err) {
      console.error("FULL DETAIL ERROR:", err);
    } finally {
      setModalFetchLoading(false);
    }
    return null;
  };

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

  const handlePmsStatusChange = (index, value) => {
    if (!detailedTx || !detailedTx.stocks) return;

    const updatedStocks = [...detailedTx.stocks];
    updatedStocks[index].pms_status = value;

    setDetailedTx({
      ...detailedTx,
      stocks: updatedStocks
    });
  };

  const closeAllModals = () => {
    setSelectedTx(null);
    setDeclineTx(false);
    setDeclineComment("");
    setDetailedTx(null);
    setTransferConfirmToPMSTx(null);
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
                    onClick={() => {
                      if (tx.status === "RETURNED") {
                        setTransferConfirmToPMSTx(tx);
                        handleFetchFullDetails(tx.id);
                      } else {
                        setSelectedTx(tx);
                      }
                    }}
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
                      {tx.status === "RETURNED" ? (
                        <button
                          className='reopen-btn'
                          style={{ margin: 0 }}
                          disabled={actionLoading || modalFetchLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            setTransferConfirmToPMSTx(tx);
                            handleFetchFullDetails(tx.id);
                          }}
                        >
                          Transfer to PMS
                        </button>
                      ) : (
                        <button
                          className='review-btn'
                          style={{ margin: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTx(tx);
                          }}
                        >
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

      {/* READONLY DETAIL MODAL */}
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
              <button onClick={closeAllModals} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
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

      {/* VERIFY CONDITIONS & TRANSFER TO PMS MODAL */}
      {transferConfirmToPMSTx && detailedTx && (
        <div
          className="modal-overlay"
          onClick={closeAllModals}
        >
          <div
            className="modal-container"
            style={{ maxWidth: '650px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="body-header-font3" style={{ margin: 0 }}>Verify Conditions</h3>
              <button onClick={closeAllModals} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <div className="modal-body">
              <table className="overview-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Condition Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedTx.stocks?.map((stock, i) => (
                    <tr key={i}>
                      <td>
                        <div>{stock.item_name}</div>
                        <small>{stock.serial_number}</small>
                      </td>
                      <td>
                        <select
                          className="text-box-editable"
                          value={stock.pms_status || ""}
                          onChange={(e) => handlePmsStatusChange(i, e.target.value)}
                          style={{ width: '100%', padding: '5px' }}
                        >
                          <option value="" disabled>-- Select Option --</option>
                          <option value="AVAILABLE">AVAILABLE</option>
                          <option value="FOR_REPAIR">FOR REPAIR</option>
                          <option value="DECOMMISSIONED">DECOMMISSIONED</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button
                className="accept-btn"
                disabled={actionLoading}
                onClick={() => {
                  const incomplete = detailedTx.stocks.some(s => !s.pms_status);
                  if (incomplete) {
                    alert("Please select a valid PMS tracking status for all listed items before proceeding.");
                    return;
                  }

                  const updatesPayload = detailedTx.stocks.map((s) => ({
                    serial_number: s.serial_number,
                    condition: s.condition_releasing || s.condition_current || "N/A",
                    status: s.pms_status
                  }));

                  handleAction(
                    'transfer_to_pms',
                    {
                      transaction_id: transferConfirmToPMSTx.id,
                      custom_update: updatesPayload
                    }
                  );
                }}
              >
                Complete Transfer to PMS
              </button>
              <button className="cancel-btn" onClick={closeAllModals}>
                Cancel
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