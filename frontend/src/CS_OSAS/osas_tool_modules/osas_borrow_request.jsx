import React, { useState, useEffect } from 'react';
import { ErrorMessage } from '../../tool_modules/error_message.jsx';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import '../osas_dashboard.css';

export const OsasBorrowRequest = () => {
    const [borrowForm, setBorrowForm] = useState({
        studentNumber: '',
        itemId: '',
        quantity: 1,
    });

    const [studentInfo, setStudentInfo] = useState(null);

    const [availableItems, setAvailableItems] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorModal, setErrorModal] = useState({ isOpen: false, subject: '', message: '' });

    const selectedItemData = availableItems.find(item => item.id === parseInt(borrowForm.itemId));

    // Handle input and dropdown changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setBorrowForm(prev => ({ ...prev, [name]: value }));
    };

    const closeErrorModal = () => setErrorModal({ ...errorModal, isOpen: false });

    const submitBorrowRequest = async (e) => {
        e.preventDefault();

        if (!borrowForm.studentNumber || !borrowForm.itemId) {
            alert("Please verify Student ID and Item selection.");
            return;
        }

        setIsProcessing(true);
        try {
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/transactions/request_borrow/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    student_number: borrowForm.studentNumber,
                    item_id: parseInt(borrowForm.itemId),
                    quantity: borrowForm.quantity
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert("Borrow request submitted successfully.");
                setBorrowForm({ studentNumber: '', itemId: '', quantity: 1, comment: '' });
            } else {
                setErrorModal({
                    isOpen: true,
                    subject: data.detail?.subject || "Submission Failed",
                    message: data.detail?.message || "Could not process request."
                });
            }
        } catch (error) {
            console.error("Submission failed:", error);
            setErrorModal({
                isOpen: true,
                subject: "Network Error",
                message: "Server is unreachable."
            });
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        const fetchStudentInfo = async () => {
            if (borrowForm.studentNumber.length >= 7) {
                try {
                    const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/students/get_all/`, {
                        method: 'GET',
                        credentials: 'include'
                    });

                    const data = await response.json();

                    if (response.ok && data.students) {
                        const found = data.students.find(
                            (s) => s.student_number.trim() === borrowForm.studentNumber.trim()
                        );
                        setStudentInfo(found || null);
                    } else {
                        setErrorModal({
                            isOpen: true,
                            subject: data.detail?.subject || "Error",
                            message: data.detail?.message || "Failed to verify student number."
                        });
                    }
                } catch (error) {
                    console.error("Failed to verify student:", error);
                }
            } else {
                setStudentInfo(null);
            }
        };

        fetchStudentInfo();
    }, [borrowForm.studentNumber]);

    useEffect(() => {
        const fetchAvailableItems = async () => {
            try {
                const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/items/get_all_full/`, {
                    method: "GET",
                    credentials: 'include'
                });

                const data = await response.json();

                if (response.ok) {
                    setAvailableItems(data.items || []);
                } else {
                    setErrorModal({
                        isOpen: true,
                        subject: data.detail?.subject || "Error",
                        message: data.detail?.message || "Failed to load available items."
                    });
                }
            } catch (error) {
                console.error("Failed to fetch available items:", error);
            }
        };

        fetchAvailableItems();
    }, []);

    return (
        <div className="main-dashboard-container">
            <h2 style={{ color: '#740A03' }}>Borrow Request</h2>

            <form onSubmit={submitBorrowRequest} className="borrow-form">
                {/* Student ID */}
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

                {/* Live Student Info Card */}
                {studentInfo && (
                    <div className="student-id-card">
                        <div className="id-card-name">{studentInfo.name}</div>
                        <div className="id-card-grid">
                            <div className="id-field">
                                <span className="id-label">Course</span>
                                <div className="id-value">{studentInfo.course_name}</div>
                            </div>

                            <div className="id-field">
                                <span className="id-label">Section</span>
                                <div className="id-value">{studentInfo.section}</div>
                            </div>

                            <div className="id-field">
                                <span className="id-label">Year Level</span>
                                <div className="id-value">{studentInfo.year}</div>
                            </div>

                            <div className="id-field">
                                <span className="id-label">Status</span>
                                <div className="id-value" style={{ color: '#166534' }}>Verified</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Equipment Selection */}
                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label className="id-label">Equipment</label>
                    <select
                        name="itemId"
                        className="status-select"
                        value={borrowForm.itemId}
                        onChange={handleInputChange}
                    >
                        <option value="">-- Select Item --</option>
                        {availableItems.map((item) => {
                            const canBorrow = item.is_available && (item.stocks?.length > 0);

                            return (
                                <option
                                    key={item.id}
                                    value={item.id}
                                    disabled={!canBorrow} 
                                    style={{ color: canBorrow ? 'inherit' : '#999' }} 
                                >
                                    {item.name} {canBorrow ? '' : '(Not Available)'}
                                </option>
                            );
                        })}
                    </select>
                </div>

                {/* For Dropdown of available items */}
                {selectedItemData && (
                    <div className="borrow-preview-card">
                        <div className="preview-img-container">
                            {selectedItemData.image_path ? (
                                <img
                                    src={`${CONFIG.ip}:${CONFIG.port}/static/${selectedItemData.image_path.split('/').pop()}`}
                                    alt=""
                                />
                            ) : (
                                <div className="preview-no-image">No Image</div>
                            )}
                        </div>

                        <div className="preview-details">
                            <h3 className="preview-name">{selectedItemData.name}</h3>
                            <p className="preview-desc">{selectedItemData.description}</p>
                            <div className="preview-status-row">
                                <span className={`status-badge ${selectedItemData.is_available ? 'available' : 'unavailable'}`}>
                                    {
                                        selectedItemData.stocks?.filter(stock => stock.status === 'AVAILABLE').length || 0
                                    } Units Available
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quantity */}
                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label className="id-label">Quantity</label>
                    <input
                        type="number"
                        name="quantity"
                        min="1"
                        className="status-select"
                        style={{ width: '100%', padding: '10px' }}
                        value={borrowForm.quantity}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="sidebar"
                    disabled={isProcessing}
                    style={{ cursor: isProcessing ? 'not-allowed' : 'pointer', width: '100%' }}
                >
                    <strong>{isProcessing ? "Processing..." : "Submit Request"}</strong>
                </button>
            </form>

            {/* Error Message Modal Integration */}
            {errorModal.isOpen && (
                <ErrorMessage
                    subject={errorModal.subject}
                    message={errorModal.message}
                    onReturn={closeErrorModal}
                />
            )}
        </div>
    );
};