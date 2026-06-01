import React, { useState, useEffect, useCallback } from 'react';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import '../../css_formats/global_body.css';
import { Bar, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    ArcElement,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
ChartJS.register(CategoryScale, ArcElement, LinearScale, BarElement, Title, Tooltip, Legend);
const valueLabelPlugin = {
    id: 'valueLabel',
    afterDatasetsDraw: (chart) => {
        if (chart.config.type !== 'bar') return;
        const { ctx } = chart;
        ctx.save();
        chart.data.datasets.forEach((dataset, dsIndex) => {
            const meta = chart.getDatasetMeta(dsIndex);
            meta.data.forEach((bar, index) => {
                const value = dataset.data[index];
                if (value === null || value === undefined) return;
                const x = bar.x;
                const isZero = Number(value) === 0;
                const y = isZero ? (bar.base - 6) : (bar.y + 14);
                ctx.fillStyle = isZero ? '#6b7280' : '#111827';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(String(value), x, y);
            });
        });
        ctx.restore();
    }
};
ChartJS.register(valueLabelPlugin);

const ITEM_THUMBNAIL_PLACEHOLDER =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
            <rect width="96" height="96" rx="18" fill="#e5e7eb" />
            <circle cx="48" cy="40" r="14" fill="#94a3b8" />
            <path d="M20 78c6-14 18-22 28-22s22 8 28 22" fill="#94a3b8" />
        </svg>
    `);

const API_BASE = `${CONFIG.ip}:${CONFIG.port}/transactions`;
const DASHBOARD_API = `${CONFIG.ip}:${CONFIG.port}/dashboard`;
const STATIC_BASE = `${CONFIG.ip}:${CONFIG.port}`;

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

export function OsasDashboardOverview({ onNavigate }) {
    const [transactions, setTransactions] = useState([]);
    const [items, setItems] = useState([]);
    const [inventorySummary, setInventorySummary] = useState(null);
    const [previewItem, setPreviewItem] = useState(null);
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
    const fetchItems = useCallback(async () => {
        try {
            const response = await fetch(`${DASHBOARD_API}/inventory/`, {
                method: 'GET',
                credentials: 'include',
            });
            const data = await response.json();
            if (response.ok) {
                const inv = data.inventory || {};
                setInventorySummary(inv);
                setItems(inv.items || []);
            } else {
                console.error('Failed to fetch inventory', data);
            }
        } catch (err) {
            console.error('Fetch inventory error', err);
        }
    }, []);

    useEffect(() => {
        fetchTransactions();
        fetchItems();
    }, [fetchTransactions, fetchItems]);

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

    const closePreview = () => setPreviewItem(null);

    return (
        <div className="main-dashboard-container" style={{ textAlign: 'left' }}>
            <div className="card-container">
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


                {inventorySummary && (
                    <div style={{ marginTop: 24 }}>
                        <h3 style={{ margin: '8px 0' }}>Overall inventory summary</h3>
                        <div style={{ background: '#fff', padding: 12, borderRadius: 6 }}>
                            <div style={{ height: 360 }}>
                                <Bar
                                    data={{
                                        labels: ['Total', 'Available', 'Borrowed', 'For Repair', 'Decommissioned'],
                                        datasets: [
                                            {
                                                label: 'Counts',
                                                data: [
                                                    Number(inventorySummary.overall_total || 0),
                                                    Number(inventorySummary.overall_available || 0),
                                                    Number(inventorySummary.overall_borrowed || 0),
                                                    Number(inventorySummary.overall_for_repair || 0),
                                                    Number(inventorySummary.overall_decommissioned || 0),
                                                ],
                                                backgroundColor: [
                                                    'rgba(99, 102, 241, 0.6)',
                                                    'rgba(75, 192, 192, 0.6)',
                                                    'rgba(54, 162, 235, 0.6)',
                                                    'rgba(255, 205, 86, 0.6)',
                                                    'rgba(201, 203, 207, 0.6)'
                                                ],
                                                borderColor: [
                                                    'rgba(99, 102, 241, 1)',
                                                    'rgba(75, 192, 192, 1)',
                                                    'rgba(54, 162, 235, 1)',
                                                    'rgba(255, 205, 86, 1)',
                                                    'rgba(201, 203, 207, 1)'
                                                ]
                                            }
                                        ]
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: false },
                                            title: { display: false }
                                        },
                                        scales: {
                                            x: { stacked: false },
                                            y: { beginAtZero: true }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ marginTop: 24 }}>
                    <h3 style={{ margin: '8px 0' }}>Inventory status by item</h3>
                    <h4 style={{ margin: '4px 0', color: '#6b7280', fontStyle: 'italic' }}>Note: Decommissioned stocks is not included in the total summary of the items.*
</h4>
                    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
                        {items.map((item) => (
                            (() => {
                                const rawTotal = Number(item.total || 0);
                                const decommissioned = Number(item.decommissioned || 0);
                                const total = Math.max(0, rawTotal - decommissioned);

                                const available = Number(item.available || 0);
                                const borrowed = Number(item.borrowed || 0);
                                const forRepair = Number(item.for_repair || 0);
                                const formatPercent = (value) => (total ? ((value / total) * 100).toFixed(1) : '0.0');

                                return (
                            <div key={item.id} style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                    <img
                                        src={item.image_path ? `${STATIC_BASE}${item.image_path}` : ITEM_THUMBNAIL_PLACEHOLDER}
                                        alt={item.name || `Item ${item.id}`}
                                        title={item.description || item.name || `Item ${item.id}`}
                                        onClick={() => setPreviewItem(item)}
                                        onError={(event) => {
                                            event.currentTarget.onerror = null;
                                            event.currentTarget.src = ITEM_THUMBNAIL_PLACEHOLDER;
                                        }}
                                        style={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 12,
                                            objectFit: 'cover',
                                            border: '1px solid #e5e7eb',
                                            backgroundColor: '#f8fafc',
                                            flexShrink: 0,
                                            cursor: 'pointer',
                                        }}
                                    />
                                    <div>
                                        <h4
                                            style={{ margin: 0 }}
                                            title={item.description || 'No description available'}
                                        >
                                            {item.name || `Item ${item.id}`}
                                        </h4>
                                        <small style={{ color: '#6b7280' }}></small>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10, fontSize: '0.86rem' }}>
                                    <span style={{ background: '#eef2ff', color: '#3730a3', padding: '4px 8px', borderRadius: 999 }}>Total: {total}</span>
                                    <span style={{ background: '#ecfeff', color: '#0f766e', padding: '4px 8px', borderRadius: 999 }}>Available: {available} ({formatPercent(available)}%)</span>
                                    <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 8px', borderRadius: 999 }}>Borrowed: {borrowed} ({formatPercent(borrowed)}%)</span>
                                    <span style={{ background: '#fefce8', color: '#a16207', padding: '4px 8px', borderRadius: 999 }}>For Repair: {forRepair} ({formatPercent(forRepair)}%)</span>
                                    |<span style={{ background: '#f3f4f6', color: '#374151', padding: '4px 8px', borderRadius: 999 }}>Decommissioned: {Number(item.decommissioned || 0)}*</span>
                                </div>
                                <div style={{ height: 300 }}>
                                    <Pie
                                        data={{
                                            labels: ['Available', 'Borrowed', 'For Repair', 'Decommissioned'],
                                            datasets: [
                                                {
                                                    label: 'Count',
                                                    data: [
                                                        Number(item.available || 0),
                                                        Number(item.borrowed || 0),
                                                        Number(item.for_repair || 0),
                                                    ],
                                                    backgroundColor: [
                                                        'rgba(75, 192, 192, 0.6)',
                                                        'rgba(54, 162, 235, 0.6)',
                                                        'rgba(255, 205, 86, 0.6)',
                                                        'rgba(201, 203, 207, 0.6)'
                                                    ],
                                                    borderColor: [
                                                        'rgba(75, 192, 192, 1)',
                                                        'rgba(54, 162, 235, 1)',
                                                        'rgba(255, 205, 86, 1)',
                                                        'rgba(201, 203, 207, 1)'
                                                    ]
                                                }
                                            ]
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: { display: true, position: 'bottom' },
                                                title: { display: false }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                                );
                            })()
                        ))}
                    </div>
                </div>
                

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

                {previewItem && (
                    <div
                        onClick={closePreview}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(15, 23, 42, 0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 20,
                            zIndex: 50,
                        }}
                    >
                        <div
                            onClick={(event) => event.stopPropagation()}
                            style={{
                                background: 'linear-gradient(180deg, #ffffff 0%, #fef2f2 100%)',
                                borderRadius: 16,
                                padding: 20,
                                maxWidth: 720,
                                width: '100%',
                                border: '1px solid #7f1d1d',
                                borderTop: '6px solid #7f1d1d',
                                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
                            }}
                        >
                            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                <img
                                    src={previewItem.image_path ? `${STATIC_BASE}${previewItem.image_path}` : ITEM_THUMBNAIL_PLACEHOLDER}
                                    alt={previewItem.name || `Item ${previewItem.id}`}
                                    style={{
                                        width: 220,
                                        height: 220,
                                        borderRadius: 14,
                                        objectFit: 'cover',
                                        border: '1px solid #e5e7eb',
                                        backgroundColor: '#f8fafc',
                                        flexShrink: 0,
                                    }}
                                    onError={(event) => {
                                        event.currentTarget.onerror = null;
                                        event.currentTarget.src = ITEM_THUMBNAIL_PLACEHOLDER;
                                    }}
                                />
                                <div style={{ flex: '1 1 260px' }}>
                                    <h3 style={{ marginTop: 0, marginBottom: 10, color: '#7f1d1d' }}>{previewItem.name || `Item ${previewItem.id}`}</h3>
                                    <p style={{ marginTop: 0, color: '#334155', lineHeight: 1.6 }}>
                                        {previewItem.description || 'No description available.'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={closePreview}
                                        style={{
                                            marginTop: 8,
                                            border: 'none',
                                            borderRadius: 10,
                                            padding: '10px 14px',
                                            background: '#7f1d1d',
                                            color: '#fff',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Close preview
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}







