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

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState("list");

  const [detailedTx, setDetailedTx] = useState(null);

  const [modalFetchLoading, setModalFetchLoading] = useState(false);

  const [transferConfirmTx, setTransferConfirmTx] = useState(null);

  // FIXED: Standardized casing to camelCase across the component
  const [transferConfirmRETURNTx, setTransferConfirmRETURNTx] = useState(null);

  const [transferConfirmToPMSTx, setTransferConfirmToPMSTx] = useState(null);


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
        credentials: "include"
      });

      const data = await response.json();

      console.log("FETCHED:", data);

      if (response.ok) {
        setTransactions(data.transactions || []);
      }

    } catch (err) {
      console.error(err);
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

  useEffect(() => {

    if (selectedTx && !detailedTx) {
      handleFetchFullDetails(selectedTx.id, false);
    }

  }, [selectedTx]);

  // HANDLE ACTION
  const handleAction = async (endpoint, payload) => {

    setActionLoading(true);

    try {

      const response = await fetch(`${API_BASE}/${endpoint}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      const data = await response.json();

      if (response.ok) {

        await fetchTransactions();

        closeAllModals();

      } else {

        alert(
          data.detail?.message ||
          "Action failed."
        );

      }

    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }

  };

  // NEW API FETCH
  const handleFetchFullDetails = async (
    transactionId,
    launchReviewModal = true
  ) => {

    setModalFetchLoading(true);

    try {

      const [txRes, stockRes] = await Promise.all([

        fetch(`${API_BASE}/get_one_full/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            transaction_id: transactionId
          }),
          credentials: "include"
        }),

        fetch(`${API_BASE}/get_stock/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            transaction_id: transactionId
          }),
          credentials: "include"
        })

      ]);

      const txData = await txRes.json();

      if (!txRes.ok) {

        alert(
          txData.detail?.message ||
          "Failed to fetch transaction."
        );

        return null;
      }

      let stockConditions = [];

      if (stockRes.ok) {

        const stockData = await stockRes.json();

        stockConditions = stockData.stocks || [];
      }

      const originalStocks = txData.transaction?.stocks || [];

      const normalizeSerial = (value) =>
        String(value ?? "")
          .trim()
          .toUpperCase();

      const stockBySerial = new Map(
        stockConditions
          .filter((s) => s?.serial_number)
          .map((s) => [normalizeSerial(s.serial_number), s])
      );

      const mergedStocks = originalStocks.map((stock) => {
        const serial = normalizeSerial(stock?.serial_number);
        const matchedStock = stockBySerial.get(serial);

        const conditionFromTx =
          stock?.condition_releasing ??
          null;

        const conditionFromStock =
          matchedStock?.condition ??
          null;

        return {
          ...stock,
          item_name: txData.transaction?.item_name,
          item_id: matchedStock?.item_id ?? txData.transaction?.item_id,
          stock_status: matchedStock?.status,
          condition_current: conditionFromStock,
          condition_releasing:
            conditionFromTx ??
            conditionFromStock ??
            null,
          pms_status: "" // Initialize dropdown state empty for user selection
        };
      });

      const mergedTransaction = {
        ...txData.transaction,
        stocks: mergedStocks
      };

      setDetailedTx(mergedTransaction);

      if (launchReviewModal) {

        setModalTab("list");

        setIsReviewModalOpen(true);
      }

      return mergedTransaction;

    } catch (err) {

      console.error(
        "FULL DETAIL ERROR:",
        err
      );

    } finally {

      setModalFetchLoading(false);

    }

    return null;
  };

  const closeAllModals = () => {

    setSelectedTx(null);

    setDeclineTx(false);

    setDeclineComment("");

    setDetailedTx(null);

    setIsReviewModalOpen(false);

    setTransferConfirmTx(null);

    setTransferConfirmRETURNTx(null); // FIXED: Casing unified

    setTransferConfirmToPMSTx(null);
  };

  // CONDITION TOGGLE
  const handleToggleConfirmCondition = (
    index,
    baseCondition
  ) => {

    if (!detailedTx || !detailedTx.stocks) return;

    const updatedStocks = [...detailedTx.stocks];

    const current =
      updatedStocks[index].condition_releasing;

    const normalizedBase =
      baseCondition || "N/A";

    const isUnchanged =
      !current ||
      current === normalizedBase;

    updatedStocks[index].condition_releasing =
      isUnchanged ? "DAMAGED" : normalizedBase;

    setDetailedTx({
      ...detailedTx,
      stocks: updatedStocks
    });
  };

  // CONDITION TEXT
  const handleTextConditionChange = (
    index,
    value
  ) => {

    if (!detailedTx || !detailedTx.stocks) return;

    const updatedStocks = [...detailedTx.stocks];

    updatedStocks[index].condition_releasing = value;

    setDetailedTx({
      ...detailedTx,
      stocks: updatedStocks
    });
  };

  // HANDLER FOR SELECT DROPDOWN CHANGES
  const handlePmsStatusChange = (index, value) => {
    if (!detailedTx || !detailedTx.stocks) return;

    const updatedStocks = [...detailedTx.stocks];
    updatedStocks[index].pms_status = value;

    setDetailedTx({
      ...detailedTx,
      stocks: updatedStocks
    });
  };

  const currentStatuses =
    activeSubTab === "ALL"
      ? TABS[activeTab]
      : [activeSubTab];

  const filteredTransactions = transactions.filter(
    (tx) =>
      tx?.status &&
      currentStatuses.includes(tx.status)
  );

  return (

    <div className="main-dashboard-container">

      {/* TABS */}
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
              className={`tab-item ${activeTab === tabName
                  ? 'active'
                  : ''
                }`}
              onClick={() =>
                setActiveTab(tabName)
              }
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
            marginTop: '10px'
          }}
        >

          <div
            className={`tab-item ${activeSubTab === "ALL"
                ? 'active'
                : ''
              }`}
            onClick={() =>
              setActiveSubTab("ALL")
            }
          >
            ALL
          </div>

          {TABS[activeTab].map((status) => {

            const subCount =
              transactions.filter(
                (tx) =>
                  tx?.status === status
              ).length;

            return (

              <div
                key={status}
                className={`tab-item ${activeSubTab === status
                    ? 'active'
                    : ''
                  }`}
                onClick={() =>
                  setActiveSubTab(status)
                }
              >

                {SUBTABS_MAP[status]}

                <span className="tab-count">
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
          style={{
            gridColumn: "1 / -1"
          }}
        >

          {loading ? (

            <p style={{ padding: '20px' }}>
              Loading transactions...
            </p>

          ) : filteredTransactions.length === 0 ? (

            <p style={{ padding: '20px' }}>
              No records found.
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
                    onClick={() =>
                      setSelectedTx(tx)
                    }
                  >

                    <td>#{tx.id}</td>

                    <td>
                      {tx.student_number}
                    </td>

                    <td>

                      <span
                        className={`status-pill ${tx.status.includes('DECLINE')
                            ? 'to-do'
                            : 'completed'
                          }`}
                      >
                        {tx.status.replace(/_/g, " ")}
                      </span>

                    </td>

                    <td>
                      {tx.stocks?.length || 0}
                    </td>

                    <td>
                      {tx.status !== "ACCEPT_ISSUANCE" && tx.status !== "TRANSFERRED_TO_STUDENT" && tx.status !== "RETURNED" && (
                        <button
                          className="review-btn"
                          style={{ margin: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFetchFullDetails(tx.id, true);
                          }}
                        >
                          View
                        </button>
                      )}

                      {tx.status === "ACCEPT_ISSUANCE" && (
                        <button
                          className="reopen-btn"
                          style={{ margin: 0 }}
                          disabled={actionLoading || modalFetchLoading}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setTransferConfirmTx(tx);
                            await handleFetchFullDetails(tx.id, false);
                          }}
                        >
                          Transfer
                        </button>
                      )}

                      {tx.status === "TRANSFERRED_TO_STUDENT" && (
                        <button
                          className="reopen-btn"
                          style={{ margin: 0 }}
                          disabled={actionLoading || modalFetchLoading}
                          onClick={async (e) => {
                            e.stopPropagation();
                            // FIXED: Casing match
                            setTransferConfirmRETURNTx(tx);
                            await handleFetchFullDetails(tx.id, false);
                          }}
                        >
                          Mark as Returned
                        </button>
                      )}


                      {tx.status === "RETURNED" && (
                        <button
                          className="reopen-btn"
                          style={{ margin: 0 }}
                          disabled={actionLoading || modalFetchLoading}
                          onClick={async (e) => {
                            e.stopPropagation();
                            // FIXED: Casing match
                            setTransferConfirmToPMSTx(tx);
                            await handleFetchFullDetails(tx.id, false);
                          }}
                        >
                          Transfer to PMS
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

      {/* REVIEW MODAL */}
      {isReviewModalOpen &&
        detailedTx && (

          <div
            className="modal-overlay"
            onClick={closeAllModals}
          >

            <div
              className="modal-container"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="modal-header">

                <h3>
                  Review #{detailedTx.id}
                </h3>

                <button
                  onClick={closeAllModals}
                >
                  &times;
                </button>

              </div>

              <div className="modal-body">

                {detailedTx.stocks?.map(
                  (stock, i) => (

                    <div
                      key={i}
                      className="item-detail-row"
                      style={{
                        flexDirection: 'column'
                      }}
                    >

                      <strong>
                        {stock.item_name}
                      </strong>

                      <span>
                        SN:
                        {" "}
                        {stock.serial_number}
                      </span>

                      <span>
                        Condition:
                        {" "}
                        {stock.condition_current || stock.condition_releasing || "—"}
                      </span>

                    </div>

                  ))}

              </div>

              <div className="modal-footer">

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

      {/* TRANSFER MODAL (STUDENT) */}
      {transferConfirmTx &&
        detailedTx && (

          <div
            className="modal-overlay"
            onClick={closeAllModals}
          >

            <div
              className="modal-container"
              style={{
                maxWidth: '650px'
              }}
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="modal-header">

                <h3>
                  Verify Conditions
                </h3>

              </div>

              <div className="modal-body">

                <table className="overview-table">

                  <thead>

                    <tr>
                      <th>Item</th>
                      <th>Condition</th>
                      <th>Changed</th>
                      <th>Description</th>
                    </tr>

                  </thead>

                  <tbody>

                    {detailedTx.stocks?.map(
                      (stock, i) => {

                        const baseCondition =
                          stock.condition_current || "";

                        const baseConditionLabel =
                          baseCondition || "—";

                        const isModified =
                          Boolean(baseCondition) &&
                          (stock.condition_releasing || baseCondition) !==
                          baseCondition;

                        const conditionTextValue =
                          isModified &&
                            stock.condition_releasing !== "DAMAGED"
                            ? stock.condition_releasing
                            : "";

                        return (

                          <tr key={i}>

                            <td>

                              <div>
                                {stock.item_name}
                              </div>

                              <small>
                                {stock.serial_number}
                              </small>

                            </td>

                            <td>
                              {baseConditionLabel}
                            </td>

                            <td>

                              <input
                                type="checkbox"
                                checked={isModified}
                                disabled={!baseCondition}
                                onChange={() =>
                                  handleToggleConfirmCondition(
                                    i,
                                    baseCondition
                                  )
                                }
                              />

                            </td>

                            <td>

                              {isModified ? (

                                <input
                                  type="text"
                                  className="text-box-editable"
                                  value={conditionTextValue}
                                  placeholder="Describe damage..."
                                  onChange={(e) =>
                                    handleTextConditionChange(
                                      i,
                                      e.target.value.trim() || "DAMAGED"
                                    )
                                  }
                                />

                              ) : (

                                <span>
                                  Unchanged
                                </span>

                              )}

                            </td>

                          </tr>

                        );

                      })}

                  </tbody>

                </table>

              </div>

              <div className="modal-footer">

                <button
                  className="accept-btn"
                  disabled={actionLoading}
                  onClick={() => {

                    const updatesPayload =
                      detailedTx.stocks.map(
                        (s) => ({
                          serial_number: s.serial_number,
                          // FIXED: Runtime fallback guard against 422 errors if state is null
                          condition: s.condition_releasing || s.condition_current || "N/A"
                        })
                      );

                    handleAction(
                      'transfer_to_student',
                      {
                        transaction_id:
                          transferConfirmTx.id,

                        custom_update:
                          updatesPayload
                      }
                    );

                  }}
                >
                  Complete Transfer to Student
                </button>

                <button
                  className="cancel-btn"
                  onClick={closeAllModals}
                >
                  Cancel
                </button>

              </div>

            </div>

          </div>

        )}

      {/* TRANSFER TO RETURN MODAL */}
      {transferConfirmRETURNTx &&
        detailedTx && (

          <div
            className="modal-overlay"
            onClick={closeAllModals}
          >

            <div
              className="modal-container"
              style={{
                maxWidth: '650px'
              }}
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="modal-header">

                <h3>
                  Verify Conditions
                </h3>

              </div>

              <div className="modal-body">

                <table className="overview-table">

                  <thead>

                    <tr>
                      <th>Item</th>
                      <th>Condition</th>
                      <th>Changed</th>
                      <th>Description</th>
                    </tr>

                  </thead>

                  <tbody>

                    {detailedTx.stocks?.map(
                      (stock, i) => {

                        const baseCondition =
                          stock.condition_current || "";

                        const baseConditionLabel =
                          baseCondition || "—";

                        const isModified =
                          Boolean(baseCondition) &&
                          (stock.condition_releasing || baseCondition) !==
                          baseCondition;

                        const conditionTextValue =
                          isModified &&
                            stock.condition_releasing !== "DAMAGED"
                            ? stock.condition_releasing
                            : "";

                        return (

                          <tr key={i}>

                            <td>

                              <div>
                                {stock.item_name}
                              </div>

                              <small>
                                {stock.serial_number}
                              </small>

                            </td>

                            <td>
                              {baseConditionLabel}
                            </td>

                            <td>

                              <input
                                type="checkbox"
                                checked={isModified}
                                disabled={!baseCondition}
                                onChange={() =>
                                  handleToggleConfirmCondition(
                                    i,
                                    baseCondition
                                  )
                                }
                              />

                            </td>

                            <td>

                              {isModified ? (

                                <input
                                  type="text"
                                  className="text-box-editable"
                                  value={conditionTextValue}
                                  placeholder="Describe damage..."
                                  onChange={(e) =>
                                    handleTextConditionChange(
                                      i,
                                      e.target.value.trim() || "DAMAGED"
                                    )
                                  }
                                />

                              ) : (

                                <span>
                                  Unchanged
                                </span>

                              )}

                            </td>

                          </tr>

                        );

                      })}

                  </tbody>

                </table>

              </div>

              <div className="modal-footer">

                <button
                  className="accept-btn"
                  disabled={actionLoading}
                  onClick={() => {

                    const updatesPayload =
                      detailedTx.stocks.map(
                        (s) => ({
                          serial_number: s.serial_number,
                          // FIXED: Added runtime safety fallback string block to explicitly prevent backend 422 responses
                          condition: s.condition_releasing || s.condition_current || "N/A"
                        })
                      );

                    handleAction(
                      'return',
                      {
                        transaction_id:
                          transferConfirmRETURNTx.id,

                        custom_update:
                          updatesPayload
                      }
                    );

                  }}
                >
                  Mark as Return
                </button>

                <button
                  className="cancel-btn"
                  onClick={closeAllModals}
                >
                  Cancel
                </button>

              </div>

            </div>

          </div>

        )}

      {/* TRANSFER TO PMS MODAL */}
      {transferConfirmToPMSTx &&
        detailedTx && (

          <div
            className="modal-overlay"
            onClick={closeAllModals}
          >

            <div
              className="modal-container"
              style={{
                maxWidth: '650px'
              }}
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="modal-header">

                <h3>
                  Verify Conditions
                </h3>

              </div>

              <div className="modal-body">

                <table className="overview-table">

                  <thead>

                    <tr>
                      <th>Item</th>
                      <th>Condition</th>
                    </tr>

                  </thead>

                  <tbody>

                    {detailedTx.stocks?.map(
                      (stock, i) => {

                        const baseCondition =
                          stock.condition_current || "";

                        const baseConditionLabel =
                          baseCondition || "—";

                        const isModified =
                          Boolean(baseCondition) &&
                          (stock.condition_releasing || baseCondition) !==
                          baseCondition;

                        const conditionTextValue =
                          isModified &&
                            stock.condition_releasing !== "DAMAGED"
                            ? stock.condition_releasing
                            : "";

                        return (

                          <tr key={i}>

                            <td>

                              <div>
                                {stock.item_name}
                              </div>

                              <small>
                                {stock.serial_number}
                              </small>

                            </td>

                            <td>
                              {/* CHANGED: Implemented dropbox with empty default state and target variants */}
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

                        );

                      })}

                  </tbody>

                </table>

              </div>

              <div className="modal-footer">

                <button
                  className="accept-btn"
                  disabled={actionLoading}
                  onClick={() => {
                    // Check validation: Verify that every single stock has an assigned dropdown value chosen
                    const incomplete = detailedTx.stocks.some(s => !s.pms_status);
                    if (incomplete) {
                      alert("Please select a valid PMS tracking status for all listed items before proceeding.");
                      return;
                    }

                    const updatesPayload =
                      detailedTx.stocks.map(
                        (s) => ({
                          serial_number: s.serial_number,
                          condition: s.condition_releasing || s.condition_current || "N/A",
                          status: s.pms_status // Maps selected select option value directly to the update list schema
                        })
                      );

                    handleAction(
                      'transfer_to_pms', // Changed API destination endpoint path segment string back to match business route
                      {
                        transaction_id:
                          transferConfirmToPMSTx.id,

                        custom_update:
                          updatesPayload
                      }
                    );

                  }}
                >
                  Complete Transfer to PMS
                </button>

                <button
                  className="cancel-btn"
                  onClick={closeAllModals}
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