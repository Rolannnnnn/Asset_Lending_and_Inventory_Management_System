import React, { useState, useEffect } from 'react';

export function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // Replace with your actual API base URL
        const response = await fetch('http://localhost:8000/get_all/?logged=1');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail?.message || 'Failed to fetch transactions');
        }

        const data = await response.json();
        setTransactions(data.transactions);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading transactions...</div>;
  if (error) return <div className="p-8 text-red-500 text-center">Error: {error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Transaction History</h1>
      
      <div className="space-y-6">
        {transactions.map((tx) => (
          <div key={tx.id} className="border rounded-lg shadow-sm bg-white overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
              <div>
                <span className="font-mono text-sm text-gray-500">ID: {tx.id}</span>
                <h2 className="font-semibold text-lg">Student: {tx.student_number}</h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                tx.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {tx.status.toUpperCase()}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4 p-4">
              {/* Stocks Section */}
              <div>
                <h3 className="font-medium mb-2 text-gray-700 border-bottom">Items / Stocks</h3>
                <ul className="text-sm space-y-2">
                  {tx.stocks.map((stock, idx) => (
                    <li key={idx} className="bg-gray-50 p-2 rounded border">
                      <p><strong>SN:</strong> {stock.serial_number}</p>
                      <p className="text-xs text-gray-600">Release: {stock.condition_releasing}</p>
                      {stock.condition_returning && (
                        <p className="text-xs text-gray-600">Return: {stock.condition_returning}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Events/Timeline Section */}
              <div>
                <h3 className="font-medium mb-2 text-gray-700">Timeline</h3>
                <div className="relative border-l-2 border-gray-200 ml-2 pl-4 space-y-4">
                  {tx.events.map((event, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[25px] mt-1.5 w-3 h-3 rounded-full bg-gray-300 border-2 border-white"></div>
                      <p className="text-sm font-bold uppercase text-gray-600">{event.type}</p>
                      <p className="text-xs text-gray-400">{new Date(event.date).toLocaleString()}</p>
                      {event.comment && <p className="text-sm italic mt-1">"{event.comment}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {transactions.length === 0 && (
          <p className="text-center text-gray-500">No transactions found.</p>
        )}
      </div>
    </div>
  );
};

export default Transactions;