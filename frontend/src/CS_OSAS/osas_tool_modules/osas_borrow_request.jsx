import React, { useState, useEffect } from 'react';
import { ErrorMessage } from '../../tool_modules/error_message.jsx';
/*import CONFIG from '../../tool_modules/FETCH_IP.json';*/
import CONFIG from '../../tool_modules/config.js';
import '../../css_formats/global_body.css';

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
            setErrorModal({
                isOpen: true,
                subject: "Validation Error",
                message: "Please verify Student ID and Item selection before submitting."
            });
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
                setErrorModal({
                    isOpen: true,
                    subject: "Submission Successful",
                    message: "The asset borrow request track log record has been processed and routed."
                });
                setBorrowForm({ studentNumber: '', itemId: '', quantity: 1 });
            } else {
                setErrorModal({
                    isOpen: true,
                    subject: data.detail?.subject || "Submission Failed",
                    message: data.detail?.message || "Could not process asset balance allocation request."
                });
            }
        } catch (error) {
            console.error("Submission failed:", error);
            setErrorModal({
                isOpen: true,
                subject: "Network Error",
                message: "The backend server API service endpoint is unreachable."
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
                            subject: data.detail?.subject || "Verification Failure",
                            message: data.detail?.message || "Failed to query system student data profiles."
                        });
                    }
                } catch (error) {
                    console.error("Failed to verify student:", error);
                    setErrorModal({
                        isOpen: true,
                        subject: "Connection Interrupted",
                        message: "Network fault encountered during real-time student indexing confirmation sequence tasks."
                    });
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
                        subject: data.detail?.subject || "Inventory Load Error",
                        message: data.detail?.message || "Failed to load active catalog items tracking array indexes."
                    });
                }
            } catch (error) {
                console.error("Failed to fetch available items:", error);
                setErrorModal({
                    isOpen: true,
                    subject: "Catalog Sync Exception",
                    message: "Critical communication breakdown occurred while synchronizing current equipment records."
                });
            }
        };

        fetchAvailableItems();
    }, []);

    return (
        <div className="view-container">
            <h2 className="body-header-font">Borrow Request Formulation</h2>

            <div className="card-container">
                <form onSubmit={submitBorrowRequest} className="borrow-form">
                    {/* Student ID Inputs */}
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="id-label" style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Student Number</label>
                        <input
                            type="text"
                            name="studentNumber"
                            className="text-box-editable"
                            value={borrowForm.studentNumber}
                            onChange={handleInputChange}
                            placeholder="2023-XXXXX"
                        />
                    </div>

                    {/* Live Student Info Profile Card */}
                    {studentInfo && (
                        <div className="student-id-card active-row cascade-wrapper" style={{ padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                            <div className="id-card-name" style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '8px', color: '#024f3e' }}>
                                {studentInfo.name}
                            </div>
                            <div className="id-card-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="id-field">
                                    <span className="id-label" style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Course</span>
                                    <div className="id-value" style={{ fontWeight: '600' }}>{studentInfo.course_name}</div>
                                </div>

                                <div className="id-field">
                                    <span className="id-label" style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Section</span>
                                    <div className="id-value" style={{ fontWeight: '600' }}>{studentInfo.section}</div>
                                </div>

                                <div className="id-field">
                                    <span className="id-label" style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Year Level</span>
                                    <div className="id-value" style={{ fontWeight: '600' }}>{studentInfo.year}</div>
                                </div>

                                <div className="id-field">
                                    <span className="id-label" style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Status</span>
                                    <div className="id-value" style={{ color: '#166534', fontWeight: 'bold' }}>Verified Profile</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Equipment Menu Selection */}
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="id-label" style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Equipment Specification</label>
                        <select
                            name="itemId"
                            className="text-box-editable"
                            value={borrowForm.itemId}
                            onChange={handleInputChange}
                        >
                            <option value="">-- Select Item From Registry --</option>
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

                    {/* Dropdown Meta Data Allocation Information Previews */}
                    {selectedItemData && (
                        <div className="borrow-preview-card active-row" style={{ display: 'flex', gap: '20px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '15px', backgroundColor: '#f9f9f9' }}>
                            <div className="preview-img-container" style={{ width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee', borderRadius: '4px', overflow: 'hidden' }}>
                                {selectedItemData.image_path ? (
                                    <img
                                        src={`${CONFIG.ip}:${CONFIG.port}/static/${selectedItemData.image_path.split('/').pop()}`}
                                        alt=""
                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div className="preview-no-image" style={{ fontSize: '0.8rem', color: '#777' }}>No Image</div>
                                )}
                            </div>

                            <div className="preview-details" style={{ flex: 1 }}>
                                <h3 className="preview-name" style={{ margin: '0 0 6px 0', color: '#024f3e' }}>{selectedItemData.name}</h3>
                                <p className="preview-desc" style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#555' }}>{selectedItemData.description}</p>
                                <div className="preview-status-row">
                                    <span className={`status-badge ${selectedItemData.is_available ? 'available' : 'unavailable'}`} style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                                        {selectedItemData.stocks?.filter(stock => stock.status === 'AVAILABLE').length || 0} Units In-Stock
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quantity Configuration */}
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label className="id-label" style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Quantity Desired</label>
                        <input
                            type="number"
                            name="quantity"
                            min="1"
                            className="text-box-editable"
                            value={borrowForm.quantity}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="text-box-editable"
                        disabled={isProcessing}
                        style={{ 
                            cursor: isProcessing ? 'not-allowed' : 'pointer', 
                            width: '100%', 
                            fontWeight: 'bold',
                            backgroundColor: isProcessing ? '#ccc' : '#024f3e',
                            color: '#fff',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '4px'
                        }}
                    >
                        {isProcessing ? "Processing Submission..." : "Submit Borrow Route Request"}
                    </button>
                </form>
            </div>

            {/* Error Message Modal Integration Component Wrapper Block */}
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