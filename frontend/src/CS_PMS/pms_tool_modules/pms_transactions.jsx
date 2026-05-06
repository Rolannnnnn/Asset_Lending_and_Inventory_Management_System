import React, { useState, useEffect } from 'react';
import CONFIG from '../../tool_modules/FETCH_IP.json';


import '../../css_formats/global_body.css';

export function PMSTransactions({ user, handleLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/transactions/get_all/`, {
          method: "GET",
          credentials: "include",
        });
        const data = await response.json();
        setTransactions(data.transactions);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const getStatusClass = (status) => {
    const s = status?.toLowerCase();
    if (s === 'completed') return 'status-pill completed';
    if (s === 'in-progress') return 'status-pill in-progress';
    return 'status-pill to-do';
  };

  return (
    <div className="main-dashboard-container">
      <div className="ticket-list-header-container">
        <div className="ticket-list-wrapper">
          {loading ? (
            <p className="p-4">Loading...</p>
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
                {transactions.map((tx) => (
                  <tr key={tx.id} className="clickable-row">
                    <td>{tx.id}</td>
                    <td>{tx.student_number}</td>
                    <td>
                      <span className={getStatusClass(tx.status)}>
                        {tx.status}
                      </span>
                    </td>
                    <td>{tx.stocks.length} item(s)</td>
                    <td>
                      <button className="review-btn">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};