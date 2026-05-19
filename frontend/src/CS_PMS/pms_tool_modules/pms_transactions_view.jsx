import React, { useState, useEffect, useCallback } from 'react';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import '../../css_formats/global_body.css';

const API_BASE = `${CONFIG.ip}:${CONFIG.port}/transactions`;

export function PMSTransactions({ user, handleLogout }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTx, setSelectedTx] = useState(null);

    // PRIMARY MANAGEMENT TABS
    const [activeTab, setActiveTab] = useState("ALL");
    const [activeSubTab, setActiveSubTab] = useState("ALL");

    // COMMON LIFECYCLE ACTION STATES
    const [actionLoading, setActionLoading] = useState(false);
    const [declineTx, setDeclineTx] = useState(false);
    const [declineComment, setDeclineComment] = useState("");

    // Review and View
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [modalTab, setModalTab] = useState("main"); // "main", "list", "stocks"
    const [detailedTx, setDetailedTx] = useState(null);
    const [modalFetchLoading, setModalFetchLoading] = useState(false);
    
    // BACKWARD PMS BRIDGED STATE HOOKS
    const [transferConfirmToPMSTx, setTransferConfirmToPMSTx] = useState(null);

    // TRACK CONDITIONAL ITEM VALUES PER SERIAL LOOKUPS
    const [stockConditions, setStockConditions] = useState({});

    // SCHEMA SELECTIONS
    const TABS = {
        ALL: ["REQUEST_BORROW", "REQUEST_ISSUANCE", "ACCEPT_BORROW", "ACCEPT_ISSUANCE", "TRANSFERRED_TO_STUDENT", "RETURNED", "TRANSFERRED_TO_PMS", "DECLINE_BORROW", "DECLINE_ISSUANCE"],
        "REQUEST": ["REQUEST_BORROW", "REQUEST_ISSUANCE"],
        "ACCEPTED": ["ACCEPT_BORROW", "ACCEPT_ISSUANCE", "TRANSFERRED_TO_STUDENT"],
        COMPLETED: ["RETURNED", "TRANSFERRED_TO_PMS"],
        DECLINED: ["DECLINE_BORROW", "DECLINE_ISSUANCE"]
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

    // POOLED DATA INDEX FETCHING RETRIEVAL SYSTEM
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

    useEffect(() => {
        setActiveSubTab("ALL");
    }, [activeTab]);

    // SYNC CONDITION SYSTEM AND STATE VALUE MAPS 
    useEffect(() => {
        const activeTarget = detailedTx || selectedTx;
        if (!activeTarget) return;

        const innerTx = activeTarget.transaction || activeTarget;
        const targetStocks = activeTarget.stocks || innerTx.stocks;
        
        if (targetStocks && Array.isArray(targetStocks)) {
            const initialConditions = {};
            targetStocks.forEach((stock) => {
                if (stock.serial_number) {
                    const currentStatus = innerTx.status;
                    
                    initialConditions[stock.serial_number] = 
                        currentStatus === "TRANSFERRED_TO_STUDENT"
                            ? (stock.condition_returning || "GOOD")
                            : (stock.condition_releasing || "GOOD");
                    
                    if (stock.pms_status) {
                        initialConditions[`pms_${stock.serial_number}`] = stock.pms_status;
                    }
                }
            });
            setStockConditions(initialConditions);
        } else {
            setStockConditions({});
        }
    }, [selectedTx, detailedTx]);

    // INTEGRATED COMPREHENSIVE DETAIL FETCHING (COMBINED FROM ADMIN & PMS)
    const handleFetchFullDetails = async (transactionId, launchReviewModal = true) => {
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
                alert(txData.detail?.message || "Failed to retrieve tracking log details.");
                return null;
            }

            let liveStockData = [];
            if (stockRes.ok) {
                const stockData = await stockRes.json();
                liveStockData = stockData.stocks || [];
            }

            const originalStocks = txData.transaction?.stocks || [];
            const normalizeSerial = (val) => String(val ?? "").trim().toUpperCase();

            const stockMap = new Map(
                liveStockData
                    .filter((s) => s?.serial_number)
                    .map((s) => [normalizeSerial(s.serial_number), s])
            );

            const mergedStocks = originalStocks.map((stock) => {
                const serial = normalizeSerial(stock?.serial_number);
                const matchedLiveStock = stockMap.get(serial);
                
                const txStatus = txData.transaction?.status;
                const isPendingRequest = ["REQUEST_BORROW", "REQUEST_ISSUANCE", "ACCEPT_BORROW"].includes(txStatus);

                return {
                    ...stock,
                    item_name: txData.transaction?.item_name,
                    item_id: matchedLiveStock?.item_id ?? txData.transaction?.item_id,
                    stock_status: matchedLiveStock?.status,
                    condition_current: matchedLiveStock?.condition || null,
                    condition_releasing: isPendingRequest ? null : (stock?.condition_releasing || matchedLiveStock?.condition || null),
                    condition_returning: isPendingRequest ? null : (stock?.condition_returning || null),
                    pms_status: stock.pms_status || ""
                };
            });

            const fullyMergedTransaction = {
                ...txData.transaction,
                stocks: mergedStocks,
                student_course_code: txData.transaction?.student_course_code || txData.transaction?.student_course || "N/A",
                item_description: txData.transaction?.item_description || "No description available",
                events: txData.transaction?.events || []
            };

            setDetailedTx(fullyMergedTransaction);

            if (launchReviewModal) {
                setModalTab("main"); 
                setIsReviewModalOpen(true);
            }
            return fullyMergedTransaction;

        } catch (err) {
            console.error("UNIFIED RETRIEVAL PIPE BROKE:", err);
        } finally {
            setModalFetchLoading(false);
        }
        return null;
    };

    // SERVER ACTIONS POST
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
                alert(errorData.detail?.message || "Workflow transaction processing failed.");
            }
        } catch (err) {
            console.error("Action pipeline exception:", err);
        } finally {
            setActionLoading(false);
        }
    };

    const closeAllModals = () => {
        setSelectedTx(null);
        setDeclineTx(false);
        setDeclineComment("");
        setIsReviewModalOpen(false);
        setDetailedTx(null);
        setTransferConfirmToPMSTx(null);
        setStockConditions({});
    };

    const handlePmsStatusChange = (serialNumber, value) => {
        setStockConditions(prev => ({
            ...prev,
            [`pms_${serialNumber}`]: value
        }));
    };

    const currentStatuses = activeSubTab === "ALL" ? TABS[activeTab] : [activeSubTab];

    const filteredTransactions = transactions.filter((tx) => {
        const status = tx?.transaction?.status || tx?.status;
        return status && currentStatuses.includes(status);
    });

    return (
        <div className="main-dashboard-container" style={{ textAlign: 'left' }}>
            {/* MAIN CATEGORY NAV TABS */}
            <div className="tabs-container">
                {Object.keys(TABS).map((tabName) => {
                    const count = transactions.filter((tx) => {
                        const status = tx?.transaction?.status || tx?.status;
                        return status && TABS[tabName].includes(status);
                    }).length;

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

            {/* SECONDARY LIFECYCLE SUBTABS */}
            {activeTab !== "ALL" && (
                <div className="tabs-container" style={{ marginTop: '10px', borderBottom: 'none', background: 'transparent' }}>
                    <div
                        className={`tab-item ${activeSubTab === "ALL" ? 'active' : ''}`}
                        onClick={() => setActiveSubTab("ALL")}
                        style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                    >
                        ALL
                    </div>

                    {TABS[activeTab].map((statusKey) => {
                        const subCount = transactions.filter((tx) => {
                            const status = tx?.transaction?.status || tx?.status;
                            return status === statusKey;
                        }).length;

                        return (
                            <div
                                key={statusKey}
                                className={`tab-item ${activeSubTab === statusKey ? 'active' : ''}`}
                                onClick={() => setActiveSubTab(statusKey)}
                                style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                            >
                                {SUBTABS_MAP[statusKey] || statusKey}
                                <span className="tab-count" style={{ fontSize: '10px' }}>{subCount}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* DATA INDICES RENDER TABLE LIST */}
            <div className="ticket-list-header-container">
                <div className="ticket-list-wrapper" style={{ gridColumn: "1 / -1" }}>
                    {loading ? (
                        <p className="p-4">Loading transaction entries...</p>
                    ) : filteredTransactions.length === 0 ? (
                        <p className="p-4">No tracking indexes found inside this context tab view.</p>
                    ) : (
                        <table className="overview-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Student Number</th>
                                    <th>Equipment Item</th>
                                    <th>Status</th>
                                    <th>Items</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map((tx, index) => {
                                    const innerTx = tx.transaction || tx;
                                    const txId = innerTx.id;
                                    const txStatus = innerTx.status;
                                    const txStudent = innerTx.student_number;
                                    const txStocks = tx.stocks || innerTx.stocks || [];
                                    const txItemName = tx.item_name || innerTx.item_name || "Assigned Equipment";

                                    //PMS can ONLY explicitly execute reviews for REQUEST_ISSUANCE and RETURNED status steps
                                    const isReviewStage = txStatus === "REQUEST_ISSUANCE" || txStatus === "RETURNED";

                                    return (
                                        <tr key={txId || index} className="clickable-row">
                                            <td>#{txId}</td>
                                            <td>{txStudent}</td>
                                            <td>{txItemName}</td>
                                            <td>
                                                <span className={`status-pill ${txStatus?.includes('DECLINE') ? 'to-do' : 'completed'}`}>
                                                    {SUBTABS_MAP[txStatus] || txStatus?.replace(/_/g, " ")}
                                                </span>
                                            </td>
                                            <td>{txStocks.length}</td>
                                            <td>
                                                {txStatus === "RETURNED" ? (
                                                    <button
                                                        className="reopen-btn" style={{ margin: 0 }}
                                                        disabled={actionLoading || modalFetchLoading}
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            setTransferConfirmToPMSTx(innerTx);
                                                            await handleFetchFullDetails(txId, false);
                                                        }}
                                                    >
                                                        Transfer to PMS
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="review-btn" style={{ margin: 0 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (isReviewStage) {
                                                                handleFetchFullDetails(txId, true);
                                                            } else {
                                                                setSelectedTx(tx);
                                                            }
                                                        }}
                                                    >
                                                        {isReviewStage ? "Review" : "View"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* MODAL 1: COMPREHENSIVE APPROVAL PREVIEW MODAL (REQUEST_ISSUANCE WORKFLOW TERMINAL PANEL) */}
            {isReviewModalOpen && detailedTx && !transferConfirmToPMSTx && (() => {
                const modalInnerTx = detailedTx.transaction || detailedTx;
                const activeRecordId = detailedTx.id || modalInnerTx.id;
                const globalMatch = transactions.find(t => (t.transaction?.id || t.id) === activeRecordId);
                const currentStatus = globalMatch?.transaction?.status || globalMatch?.status || modalInnerTx.status || detailedTx.status;

                const txStudentNumber = detailedTx.student_number || modalInnerTx.student_number || "N/A";
                const txStudentName = detailedTx.student_name || modalInnerTx.student_name || "N/A";
                const txStudentEmail = detailedTx.student_email || modalInnerTx.student_email || "N/A";
                const txtStudentCourse = detailedTx.student_course_code || detailedTx.student_course || modalInnerTx.student_course || "N/A";
                const txItemName = detailedTx.item_name || modalInnerTx.item_name || "Assigned Equipment";
                const txItemDescription = detailedTx.item_description || modalInnerTx.item_description || "No description available";

                return (
                    <div className="modal-overlay" onClick={closeAllModals} style={{ zIndex: 1200 }}>
                        <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '90%', textAlign: 'left' }}>
                            <div className="modal-header">
                                <h3 className="body-header-font3" style={{ margin: 0 }}>
                                    Transaction Details #{activeRecordId}
                                </h3>
                                <button onClick={closeAllModals} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                            </div>

                            <div className="modal-body" style={{ padding: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', margin: '0 auto 20px auto', width: '100%', justifyContent: 'center' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Borrower Student</small>
                                        <span style={{ fontSize: '1.05rem', fontWeight: '600', color: '#1e293b' }}>{txStudentNumber}</span>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Student Name</small>
                                        <span style={{ fontSize: '1.05rem', fontWeight: '600', color: '#1e293b', textTransform: 'capitalize' }}>{txStudentName}</span>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Requested Equipment</small>
                                        <span style={{ fontSize: '1.05rem', fontWeight: '600', color: '#1e293b' }}>{txItemName}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '20px', gap: '30px' }}>
                                    <button onClick={() => setModalTab('main')} style={{ padding: '10px 5px', background: 'none', border: 'none', borderBottom: modalTab === 'main' ? '3px solid #2563eb' : '3px solid transparent', color: modalTab === 'main' ? '#2563eb' : '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>Main</button>
                                    <button onClick={() => setModalTab('list')} style={{ padding: '10px 5px', background: 'none', border: 'none', borderBottom: modalTab === 'list' ? '3px solid #2563eb' : '3px solid transparent', color: modalTab === 'list' ? '#2563eb' : '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>Workflow History</button>
                                    <button onClick={() => setModalTab('stocks')} style={{ padding: '10px 5px', background: 'none', border: 'none', borderBottom: modalTab === 'stocks' ? '3px solid #2563eb' : '3px solid transparent', color: modalTab === 'stocks' ? '#2563eb' : '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>Items & Conditions</button>
                                </div>

                                <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '10px' }}>
                                    {modalTab === 'main' && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '5px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderRight: '1px solid #e2e8f0', paddingRight: '15px' }}>
                                                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Borrower Student Profile</h4>
                                                <div>
                                                    <small style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Student Number</small>
                                                    <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b' }}>{txStudentNumber}</span>
                                                </div>
                                                <div>
                                                    <small style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Full Name</small>
                                                    <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b', textTransform: 'capitalize' }}>{txStudentName}</span>
                                                </div>
                                                <div>
                                                    <small style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Course / Program</small>
                                                    <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b' }}>{txtStudentCourse}</span>
                                                </div>
                                                <div>
                                                    <small style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Year & Section</small>
                                                    <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b' }}>
                                                        {detailedTx.student_year && detailedTx.student_section ? `${detailedTx.student_year} - ${detailedTx.student_section}` : 'N/A'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <small style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Email Address</small>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>{txStudentEmail}</span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '10px' }}>
                                                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Requested Inventory Allocation</h4>
                                                <div>
                                                    <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Equipment Model Name</small>
                                                    <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b' }}>{txItemName}</span>
                                                </div>
                                                <div>
                                                    <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Requested Quantity</small>
                                                    <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b' }}>{detailedTx.quantity || (detailedTx.stocks ? detailedTx.stocks.length : 1)} unit(s)</span>
                                                </div>
                                                <div>
                                                    <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Description</small>
                                                    <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b' }}>{txItemDescription}</span>
                                                </div>
                                                <div>
                                                    <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Creation Date Log</small>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>
                                                        {detailedTx.date ? new Date(detailedTx.date).toLocaleString() : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {modalTab === 'list' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            {detailedTx.events && detailedTx.events.length > 0 ? (
                                                detailedTx.events
                                                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                                                    .map((event, index) => {
                                                        let displayTitle = event.type ? event.type.replace(/_/g, " ") : "Unknown Event";
                                                        if (event.type === "REQUEST_BORROW") displayTitle = "Borrow Requested";
                                                        if (event.type === "ACCEPT_BORROW") displayTitle = "Accepted Borrow Request";
                                                        if (event.type === "REQUEST_ISSUANCE") displayTitle = "Request Issuance";

                                                        return (
                                                            <div key={index} style={{ padding: '15px', borderLeft: '4px solid #2563eb', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '0 8px 8px 0', border: '1px solid #e2e8f0', borderLeftWidth: '4px' }}>
                                                                <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>{displayTitle}</div>
                                                                <div style={{ fontSize: '0.85rem', color: '#475569' }}>Personnel: {event.personnel_name || `ID: ${event.personnel_id}`}</div>
                                                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>{event.date ? new Date(event.date).toLocaleString() : 'N/A'}</div>
                                                                {event.comment && <div style={{ marginTop: '8px', padding: '8px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.85rem', border: '1px dashed #cbd5e1' }}><strong>Note:</strong> {event.comment}</div>}
                                                            </div>
                                                        );
                                                    })
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontStyle: 'italic' }}>No registered workflow trail tracked yet.</div>
                                            )}
                                        </div>
                                    )}

                                    {modalTab === 'stocks' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {detailedTx.stocks && detailedTx.stocks.length > 0 ? (
                                                detailedTx.stocks.map((stock, i) => (
                                                    <div key={i} style={{ padding: '15px 20px', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '200px 150px 150px', gap: '15px', alignItems: 'center', textAlign: 'left' }}>
                                                            <div>
                                                                <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Serial Number</small>
                                                                <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '0.95rem' }}>{stock.serial_number || 'No Serial'}</span>
                                                            </div>
                                                            <div>
                                                                <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Initial Release Cond.</small>
                                                                <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>{stock.condition_releasing || 'Pending'}</span>
                                                            </div>
                                                            <div>
                                                                <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Return Check-In Cond.</small>
                                                                <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>{stock.condition_returning ? "Log Recorded" : "Not Returned"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No item stock metadata attached.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* ADMIN ACTION FEEDBACK INPUT MODULE */}
                                {currentStatus === "REQUEST_ISSUANCE" && (
                                    <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                                        <label style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '0.9rem' }}>Comment:</label>
                                        <textarea 
                                            className="text-box-editable" 
                                            style={{ width: '100%', minHeight: '80px', borderRadius: '8px', padding: '10px', border: '1px solid #cbd5e1' }} 
                                            value={declineComment} 
                                            onChange={(e) => setDeclineComment(e.target.value)} 
                                            placeholder="Add processing comment logs here... (Required if selecting decline actions)" 
                                        />
                                    </div>
                                )}
                            </div>

                            {/*  MODAL FOOTER DEPLOYMENT LOGIC FOR DISPATCH OVERRIDES */}
                            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                {currentStatus === "REQUEST_ISSUANCE" ? (
                                    <>
                                        <button 
                                            className="reopen-btn" 
                                            disabled={actionLoading} 
                                            onClick={() => handleAction('accept_issuance', { transaction_id: activeRecordId, comment: declineComment })}
                                        >
                                            {actionLoading ? "Processing..." : "Accept Issuance"}
                                        </button>
                                        <button 
                                            className="assign-btn" 
                                            disabled={actionLoading} 
                                            onClick={() => {
                                                if (!declineComment.trim()) {
                                                    alert("Please write a reason inside the Comment box before declining this transaction.");
                                                    return;
                                                }
                                                handleAction('decline_issuance', { transaction_id: activeRecordId, comment: declineComment });
                                            }}
                                        >
                                            Decline
                                        </button>
                                    </>
                                ) : (
                                    <span style={{ color: '#64748b', fontStyle: 'italic', marginRight: 'auto', alignSelf: 'center', fontSize: '0.85rem' }}>
                                        PMS Management Mode (View Only)
                                    </span>
                                )}
                                <button className="cancel-btn" onClick={closeAllModals}>Cancel</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* MODAL 1.5: (FOR STATUS === RETURNED) */}
            {transferConfirmToPMSTx && detailedTx && (
                <div className="modal-overlay" onClick={closeAllModals} style={{ zIndex: 1250 }}>
                    <div className="modal-container" style={{ maxWidth: '650px', width: '90%', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="body-header-font3" style={{ margin: 0 }}>Verify Conditions</h3>
                            <button onClick={closeAllModals} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                        </div>

                        <div className="modal-body" style={{ padding: '20px' }}>
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
                                                <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{stock.item_name || "Asset Equipment"}</div>
                                                <small style={{ color: '#64748b' }}>{stock.serial_number}</small>
                                            </td>
                                            <td>
                                                <select
                                                    className="text-box-editable"
                                                    value={stockConditions[`pms_${stock.serial_number}`] || ""}
                                                    onChange={(e) => handlePmsStatusChange(stock.serial_number, e.target.value)}
                                                    style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600' }}
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

                        <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                className="accept-btn"
                                disabled={actionLoading}
                                onClick={() => {
                                    const stocksArray = detailedTx.stocks || [];
                                    const incomplete = stocksArray.some(s => !stockConditions[`pms_${s.serial_number}`]);
                                    
                                    if (incomplete) {
                                        alert("Please assign a valid inventory tracking status to all records before proceeding.");
                                        return;
                                    }

                                    const customUpdatePayload = stocksArray.map(s => ({
                                        serial_number: s.serial_number,
                                        condition: s.condition_returning || s.condition_releasing || "GOOD",
                                        status: stockConditions[`pms_${s.serial_number}`]
                                    }));

                                    handleAction('transfer_to_pms', {
                                        transaction_id: transferConfirmToPMSTx.id,
                                        custom_update: customUpdatePayload
                                    });
                                }}
                                style={{ background: '#1e3a8a', color: '#fff', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold' }}
                            >
                                Complete Transfer to PMS
                            </button>
                            <button className="cancel-btn" onClick={closeAllModals}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: BASE SUMMARY TRANSACTION DISPLAY DETAILS FRAMEWORK (READ-ONLY FOR VIEW STATE CATEGORIES) */}
            {selectedTx && !isReviewModalOpen && !transferConfirmToPMSTx && (
                <div className="modal-overlay" onClick={closeAllModals}>
                    <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '90%', textAlign: 'left' }}>
                        <div className="modal-header">
                            <h3 className="body-header-font3" style={{ margin: 0 }}>
                                Transaction Details #{selectedTx.transaction?.id || selectedTx.id}
                            </h3>
                            <button onClick={closeAllModals} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                        </div>

                        <div className="modal-body" style={{ padding: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', margin: '0 auto 20px auto', width: '100%', justifyContent: 'center' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Borrower Student</small>
                                    <span style={{ fontSize: '1.05rem', fontWeight: '600', color: '#1e293b' }}>
                                        {selectedTx.transaction?.student_number || selectedTx.student_number}
                                    </span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Student Name</small>
                                    <span style={{ fontSize: '1.05rem', fontWeight: '600', color: '#1e293b', textTransform: 'capitalize' }}>
                                        {selectedTx.student_name || "N/A"}
                                    </span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Requested Equipment</small>
                                    <span style={{ fontSize: '1.05rem', fontWeight: '600', color: '#1e293b' }}>
                                        {selectedTx.item_name || "General Equipment"}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '20px', gap: '30px' }}>
                                <button onClick={() => setModalTab('list')} style={{ padding: '10px 5px', background: 'none', border: 'none', borderBottom: modalTab === 'list' ? '3px solid #2563eb' : '3px solid transparent', color: modalTab === 'list' ? '#2563eb' : '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>Workflow History</button>
                                <button onClick={() => setModalTab('stocks')} style={{ padding: '10px 5px', background: 'none', border: 'none', borderBottom: modalTab === 'stocks' ? '3px solid #2563eb' : '3px solid transparent', color: modalTab === 'stocks' ? '#2563eb' : '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>Items & Conditions</button>
                            </div>

                            <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '10px' }}>
                                {modalTab === 'list' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
                                        {selectedTx.events && selectedTx.events.length > 0 ? (
                                            selectedTx.events
                                                .sort((a, b) => new Date(a.date) - new Date(b.date))
                                                .map((evt, idx) => {
                                                    let displayType = evt.type?.replace(/_/g, " ") || "Step Update";
                                                    if (evt.type === "REQUEST_BORROW") displayType = "Borrow Requested";
                                                    if (evt.type === "ACCEPT_BORROW") displayType = "Accepted Borrow Request";
                                                    if (evt.type === "REQUEST_ISSUANCE") displayType = "Request Issuance";

                                                    return (
                                                        <div key={idx} style={{ padding: '15px', borderLeft: '4px solid #2563eb', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '0 8px 8px 0', border: '1px solid #e2e8f0', borderLeftWidth: '4px' }}>
                                                            <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>{displayType}</div>
                                                            <div style={{ fontSize: '0.85rem', color: '#475569' }}>Personnel: {evt.personnel_name || `ID: ${evt.personnel_id}`}</div>
                                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>{evt.date ? new Date(evt.date).toLocaleString() : "Time N/A"}</div>
                                                            {evt.comment && <div style={{ marginTop: '8px', padding: '8px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.85rem', border: '1px dashed #cbd5e1' }}><strong>Note:</strong> {evt.comment}</div>}
                                                        </div>
                                                    );
                                                })
                                        ) : (
                                            <p style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: '20px', textAlign: 'center' }}>No workflow history recorded.</p>
                                        )}
                                    </div>
                                )}

                                {modalTab === 'stocks' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                                        {selectedTx.stocks?.map((stock, i) => (
                                            <div key={i} style={{ padding: '15px 20px', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '200px 150px 150px', gap: '15px', alignItems: 'center', textAlign: 'left' }}>
                                                    <div>
                                                        <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Serial Number</small>
                                                        <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '0.95rem' }}>{stock.serial_number || 'No Serial'}</span>
                                                    </div>
                                                    <div>
                                                        <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Initial Release Cond.</small>
                                                        <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>{stock.condition_releasing || 'Pending'}</span>
                                                    </div>
                                                    <div>
                                                        <small style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Return Check-In Cond.</small>
                                                        <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>{stock.condition_returning ? "Log Recorded" : "Not Returned"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <span style={{ color: '#777', fontStyle: 'italic', marginRight: 'auto', alignSelf: 'center', fontSize: '0.85rem' }}>
                                Archived Log Record (View Only)
                            </span>
                            <button className="cancel-btn" onClick={closeAllModals}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}