import React, { useState, useEffect } from 'react';

export const OsasBorrowRequest = () => {
    const [borrowForm, setBorrowForm] = useState({
        studentNumber: '',
        itemId: '',
        quantity: 1,
        comment: ''
    });

    const [studentInfo, setStudentInfo] = useState(null);
    const [availableItems, setAvailableItems] = useState([]); 

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setBorrowForm(prev => ({ ...prev, [name]: value }));
    };

    const submitBorrowRequest = async (e) => {
        e.preventDefault();
        if (!borrowForm.studentNumber || !borrowForm.itemId) {
            alert("Please verify Student ID and Item selection.");
            return;
        }
        try {
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/transactions/request/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_number: borrowForm.studentNumber,
                    item_id: borrowForm.itemId,
                    quantity: borrowForm.quantity,
                    personnel_id: 1, // personel id
                    comment: borrowForm.comment || "Initial borrow request"
                })
            });
            if (response.ok) {
                alert("Borrow Request Submitted Successfully!");
                setBorrowForm({ studentNumber: '', itemId: '', quantity: 1, comment: '' });
                setStudentInfo(null);
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.detail.message}`);
            }
        } catch (error) {
            console.error("Submission failed:", error);
        }
    };

    return (
        <div className="placeholder-card">
            <h2 style={{ color: '#740A03' }}>Borrow Request</h2>
            <form onSubmit={submitBorrowRequest} className="borrow-form">
                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label className="id-label">Student Number</label>
                    <input
                        type="text"
                        name="studentNumber"
                        className="status-select"
                        style={{ width: '100%', padding: '10px' }}
                        value={borrowForm.studentNumber}
                        onChange={handleInputChange}
                        placeholder="2023-XXXXX"
                    />
                </div>

                {/* Item Selection */}
                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label className="id-label">Equipment</label>
                    <select
                        name="itemId"
                        className="status-select"
                        style={{ width: '100%', padding: '10px' }}
                        value={borrowForm.itemId}
                        onChange={handleInputChange}
                    >
                        <option value="">-- Select Item --</option>
                        {/*API here */}
                    </select>
                </div>

                {/* Comment/Notes */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="id-label">Notes / Purpose</label>
                    <textarea
                        name="comment"
                        className="status-select"
                        style={{ width: '100%', padding: '10px', height: '80px', resize: 'none' }}
                        value={borrowForm.comment}
                        onChange={handleInputChange}
                        placeholder="Reason for borrowing..."
                    />
                </div>

                <button type="submit" className="sidebar">
                   <strong> Submit Request </strong>
                </button>
            </form>
        </div>
    );
};