import React, { useState, useEffect, useCallback } from 'react';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import '../../css_formats/global_body.css';

const API_BASE = `${CONFIG.ip}:${CONFIG.port}/transactions`;

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
    REQUEST: ["REQUEST_BORROW", "REQUEST_ISSUANCE"],
    ACCEPTED: ["ACCEPT_BORROW", "ACCEPT_ISSUANCE", "TRANSFERRED_TO_STUDENT"],
    COMPLETED: ["RETURNED", "TRANSFERRED_TO_PMS"],
    DECLINED: ["DECLINE_BORROW", "DECLINE_ISSUANCE"]
};

export function AdminDashboardOverview({ onNavigate }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const getTransactionStatus = (tx) => {
        return tx?.transaction?.status || tx?.status;
    };

    const countByTab = (tabKey) => {
        return transactions.filter(tx =>
            TABS[tabKey].includes(getTransactionStatus(tx))
        ).length;
    };

    const countByStats = (statusKey) => {
        return transactions.filter(tx =>
            getTransactionStatus(tx) === statusKey
        ).length;
    };

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/get_all/`, {
                method: "GET",
                credentials: "include"
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail?.message || "Failed to fetch transactions."
                );
            }

            setTransactions(data.transactions || []);
        } catch (err) {
            console.error(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const dashboardCards = [
        {
            title: "Pending Requests",
            subtitle_1: "Borrow Request",
            subtitle_2: "Request Issuance",
            value: countByTab("REQUEST"),
            value_1: countByStats("REQUEST_BORROW"), 
            value_2: countByStats("REQUEST_ISSUANCE"),
            tab: "REQUEST",
            style: {
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#78350f'
            }
        },
        {
            title: "Accepted Transactions",
            subtitle_1: "Accepted Borrow Request",
            subtitle_2: "Accepted Issuance Request",
            subtitle_3: "Transfer to Student",
            value: countByTab("ACCEPTED"),
            value_1: countByStats("ACCEPT_BORROW"),
            value_2: countByStats("ACCEPT_ISSUANCE"),
            value_3: countByStats("TRANSFERRED_TO_STUDENT"),
            tab: "ACCEPTED",
            style: {
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#14532d'
            }
        },
        {
            title: "Declined / Rejected",
            subtitle_1: "Declined Borrow Request",
            subtitle_2: "Declined Issuance Request",
            value: countByTab("DECLINED"), 
            value_1: countByStats("DECLINE_BORROW"),
            value_2: countByStats("DECLINE_ISSUANCE"),
            tab: "DECLINED",
            style: {
                backgroundColor: '#fff5f5',
                border: '1px solid #fed7d7',
                color: '#742a2a'
            }
        },
        {
            title: "Completed Transactions",
            subtitle_1: "Returned",
            subtitle_2: "Transfer to PMS",
            value: countByTab("COMPLETED"),
            value_1: countByStats("RETURNED"),
            value_2: countByStats("TRANSFERRED_TO_PMS"),
            tab: "COMPLETED",
            style: {
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#0f172a'
            }
        },
        {
            title: "Total Transactions",
            value: transactions.length,
            tab: "ALL",
            valueStyle: { fontSize: '2.8rem' }, 
            style: {
                backgroundColor: '#1e293b',
                border: '1px solid #1e293b',
                color: '#f8fafc',
            }
        }
    ];

    if (loading) {
        return (
            <div className="main-dashboard-container">
                <p>Loading overview diagnostics...</p>
            </div>
        );
    }

    return (
        <div className="main-dashboard-container" style={{ textAlign: 'left' }}>
            <div className="card-container">
                {/* Upper Grid Row Block (Cards 0, 1, 2) */}
                <div className="card-grid">
                    {dashboardCards.slice(0, 3).map((card) => (
                        <div
                            key={card.title}
                            className="dashboard-stat-card"
                            style={card.style}
                            onClick={() => onNavigate('TransactionView', card.tab)}
                        >
                            <small style={{ fontWeight: '700', textTransform: 'uppercase' }}>
                                {card.title}
                            </small>

                            <h2 style={{ marginTop: '10px', marginBottom: '8px', fontSize: '2rem', fontWeight: '700', ...card.valueStyle }}>
                                {card.value}
                            </h2> 

                            {card.subtitle_1 && (
                                <div style={{ opacity: 0.85, fontSize: '1rem' }}>
                                    <small>{card.subtitle_1}: <strong>{card.value_1}</strong></small>
                                </div>
                            )}

                            {card.subtitle_2 && (
                                <div style={{ opacity: 0.85, fontSize: '1rem', marginTop: '2px' }}>
                                    <small>{card.subtitle_2}: <strong>{card.value_2}</strong></small>
                                </div>
                            )}

                            {card.subtitle_3 && (
                                <div style={{ opacity: 0.85, fontSize: '1rem', marginTop: '2px' }}>
                                    <small>{card.subtitle_3}: <strong>{card.value_3}</strong></small>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Lower Grid Row Block (Cards 3, 4) */}
                <div className="card-grid-2col">
                    {dashboardCards.slice(3).map((card) => (
                        <div
                            key={card.title}
                            className="dashboard-stat-card"
                            style={card.style}
                            onClick={() => onNavigate('TransactionView', card.tab)}
                        >
                            <small style={{ fontWeight: '700', textTransform: 'uppercase' }}>
                                {card.title}
                            </small>

                            <h2 style={{ marginTop: '10px', marginBottom: card.subtitle_1 ? '8px' : '0px', fontSize: '2rem', fontWeight: '700', ...card.valueStyle }}>
                                {card.value}
                            </h2>

                            {card.subtitle_1 && (
                                <div style={{ opacity: 0.85, fontSize: '1rem' }}>
                                    <small>{card.subtitle_1}: <strong>{card.value_1}</strong></small>
                                </div>
                            )}

                            {card.subtitle_2 && (
                                <div style={{ opacity: 0.85, fontSize: '1rem', marginTop: '2px' }}>
                                    <small>{card.subtitle_2}: <strong>{card.value_2}</strong></small>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}