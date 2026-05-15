import React, { useState, useEffect } from 'react';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import '../admin_dashboard.css';

import { ErrorMessage } from '../../tool_modules/error_message.jsx';

export function EmployeeTable({ refreshTrigger, onEditClick }) {
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [errorModal, setErrorModal] = useState({ isOpen: false, subject: "", message: "" });
    const closeErrorModal = () => setErrorModal({ ...errorModal, isOpen: false });


    const fetchEmployees = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/accounts/get_all/`, {
                method: "GET",
                credentials: "include"
            });

            const data = await response.json();

            if (response.ok) {
                setEmployees(data.accounts || []);
                setError(null);
            } else {
                setError(data.detail?.message || "Failed to load employees.");
            }
        } catch (err) {
            console.error("Error fetching employees:", err);
            setError("Network error. Could not connect to the backend.");
        } finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchEmployees();
    }, [refreshTrigger]);

    if (isLoading) return <p>Loading employee data...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;
    if (employees.length === 0) return <p>No employees found in the system.</p>;

    return (
        <div style={{ overflowX: 'auto', marginTop: '15px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f2f2f2', borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: '12px' }}>Name</th>
                        <th style={{ padding: '12px' }}>Role</th>
                        <th style={{ padding: '12px' }}>Username</th>
                        <th style={{ padding: '12px' }}>Email</th>
                        <th style={{ padding: '12px' }}>Contact</th>
                        <th style={{ padding: '12px' }}>Status</th>
                        <th style={{ padding: '12px' }}>Actions</th> 
                    </tr>
                </thead>
                <tbody>
                    {employees.map((emp) => (
                        <tr key={emp.id} style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '12px' }}>{emp.name}</td>
                            <td style={{ padding: '12px' }}>
                                <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: emp.role === 'ADMIN' ? '#ffcccc' : '#cce5ff', fontWeight: 'bold', fontSize: '0.85em' }}>
                                    {emp.role}
                                </span>
                            </td>
                            <td style={{ padding: '12px' }}>{emp.username}</td>
                            <td style={{ padding: '12px' }}>{emp.email}</td>
                            <td style={{ padding: '12px' }}>{emp.contact_number || 'N/A'}</td>
                            <td style={{ padding: '12px' }}>
                                <span style={{ color: emp.is_active ? 'green' : 'red', fontWeight: 'bold' }}>{emp.is_active ? 'Active' : 'Inactive'}</span>
                            </td>
                            <td style={{ padding: '12px' }}>
                                <button 
                                    onClick={() => onEditClick(emp)} 
                                    style={{ backgroundColor: '#3498db', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Edit
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {errorModal.isOpen && (
                <ErrorMessage
                    subject={errorModal.subject}
                    message={errorModal.message}
                    onReturn={closeErrorModal}
                />
            )}
        </div>
    );
}

export function AdminEmployee({ onClose, onSuccess }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        role: 'Roles', // Default to one of your ROLES_ALLOWED
        username: '',
        password: '',
        email: '',
        contact_number: ''
    });

    const [errorModal, setErrorModal] = useState({ isOpen: false, subject: "", message: "" });
    const closeErrorModal = () => setErrorModal({ ...errorModal, isOpen: false });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Using the endpoint from your FastAPI router
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/accounts/create_account/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setErrorModal({ isOpen: true, subject: "Success", message: data.detail?.message || "Employee account created successfully." });
                onSuccess(); 
                onClose();
            } else {
                const errorMsg = data.detail?.message || "Failed to create account";
                setErrorModal({ isOpen: true, subject: "Creation Error", message: errorMsg });
            }
        } catch (err) {
            console.error("Submission error:", err);
            setErrorModal({ isOpen: true, subject: "Network Error", message: "Could not connect to backend." });
        } finally {
            setIsSubmitting(false);
        }
    };

    

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2 className="body-header-font" style={{ border: 'none', padding: 0 }}>Register New Employee</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '20px' }}>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            
                            <div>
                                <label>Full Name</label>
                                <input name="name" className="text-box-editable" value={formData.name} onChange={handleChange} required />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label>Role</label>
                                    <select name="role" className="text-box-editable" value={formData.role} onChange={handleChange}>
                                        <option value="ADMIN">Admin</option>
                                        <option value="PMS">PMS</option>
                                        <option value="SAS">SAS</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Contact Number</label>
                                    <input name="contact_number" className="text-box-editable" value={formData.contact_number} onChange={handleChange} />
                                </div>
                            </div>

                            <div>
                                <label>Email Address</label>
                                <input name="email" type="email" className="text-box-editable" value={formData.email} onChange={handleChange} required />
                            </div>

                            <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
                                <label>Username</label>
                                <input name="username" className="text-box-editable" value={formData.username} onChange={handleChange} required />

                                <label style={{ marginTop: '10px', display: 'block' }}>Password</label>
                                <input name="password" type="password" className="text-box-editable" value={formData.password} onChange={handleChange} required />
                            </div>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right', padding: '18px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button type="button" className="nav-link" style={{ backgroundColor: '#740A03', color: 'white' }} onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="nav-link" style={{ backgroundColor: '#2ecc71', color: 'white' }} disabled={isSubmitting}>
                            {isSubmitting ? 'Registering...' : 'Register Employee'}
                        </button>
                    </div>
                </form>
            </div>
            {errorModal.isOpen && (
                <ErrorMessage
                    subject={errorModal.subject}
                    message={errorModal.message}
                    onReturn={closeErrorModal}
                />
            )}
        </div>
    );
}

export function AdminEditEmployee({ employee, onClose, onSuccess }) {
    const [activeTab, setActiveTab] = useState('details'); 
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [errorModal, setErrorModal] = useState({ isOpen: false, subject: "", message: "" });
    const closeErrorModal = () => setErrorModal({ ...errorModal, isOpen: false });
    
    const [detailsData, setDetailsData] = useState({
        account_id: employee.id,
        name: employee.name,
        role: employee.role,
        email: employee.email,
        contact_number: employee.contact_number || ''
    });

    const [credentialsData, setCredentialsData] = useState({
        account_id: employee.id,
        new_username: employee.username,
        new_password: ''
    });

    // --- HANDLERS ---
    const handleDetailsSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/accounts/edit_details/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(detailsData),
            });
            const data = await response.json();

            if (response.ok) {
                setErrorModal({ isOpen: true, subject: "Update Success", message: data.detail?.message || "Employee details updated successfully." });
                onSuccess(); 
            } else {
                setErrorModal({ isOpen: true, subject: "Update Error", message: data.detail?.message || "Failed to update employee details." });
            }
        } catch (err) {
            setErrorModal({ isOpen: true, subject: "Network Error", message: "Could not connect to backend." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCredentialsSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/accounts/edit_credentials/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(credentialsData),
            });
            const data = await response.json();

            if (response.ok) {
                setErrorModal({ isOpen: true, subject: "Update Success", message: data.detail?.message || "Credentials updated successfully." });
                onSuccess();
            } else {
                setErrorModal({ isOpen: true, subject: "Update Error", message: data.detail?.message || "Failed to update credentials." });
            }
        } catch (err) {
            setErrorModal({ isOpen: true, subject: "Network Error", message: "Could not connect to backend." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusToggle = async () => {
        const newStatus = !employee.is_active; 
        const action = newStatus ? "ACTIVATE" : "DEACTIVATE";
        
        if (!window.confirm(`Are you sure you want to ${action} this account?`)) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/accounts/edit_status/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    account_id: employee.id, 
                    to_active: newStatus 
                }),
            });
            const data = await response.json();

            if (response.ok) {
                setErrorModal({ isOpen: true, subject: "Update Success", message: data.detail?.message || `Account successfully ${newStatus ? 'activated' : 'deactivated'}!` });
                onSuccess();
            } else {
                setErrorModal({ isOpen: true, subject: "Update Error", message: data.detail?.message || "Failed to update status." });
            }
        } catch (err) {
            setErrorModal({ isOpen: true, subject: "Network Error", message: "Could not connect to backend." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
    <div className="modal-overlay" onClick={onClose}>
        <div className="edit-modal-container" onClick={(e) => e.stopPropagation()}>
            
            <div className="edit-modal-header">
                <h2 className="edit-modal-title">Edit Employee: {employee.name}</h2>
                <button className="edit-modal-close" onClick={onClose}>&times;</button>
            </div>

            <div className="modal-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                    onClick={() => setActiveTab('details')}
                >
                    Profile Details
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'credentials' ? 'active' : ''}`}
                    onClick={() => setActiveTab('credentials')}
                >
                    Credentials
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
                    onClick={() => setActiveTab('status')}
                >
                    Account Status
                </button>
            </div>

            <div className="edit-form-container">
                {activeTab === 'details' && (
                    <form onSubmit={handleDetailsSubmit}>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input 
                                className="text-box-editable" 
                                value={detailsData.name} 
                                onChange={(e) => setDetailsData({...detailsData, name: e.target.value})} 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input 
                                type="email" 
                                className="text-box-editable" 
                                value={detailsData.email} 
                                onChange={(e) => setDetailsData({...detailsData, email: e.target.value})} 
                                required 
                            />
                        </div>
                        <button type="submit" className="edit-submit-btn" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                )}

                {activeTab === 'credentials' && (
                    <form onSubmit={handleCredentialsSubmit}>
                        <div className="form-group">
                            <label>New Username</label>
                            <input 
                                className="text-box-editable" 
                                value={credentialsData.new_username} 
                                onChange={(e) => setCredentialsData({...credentialsData, new_username: e.target.value})} 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>New Password</label>
                            <input 
                                type="password" 
                                className="text-box-editable" 
                                placeholder="Enter new password" 
                                value={credentialsData.new_password} 
                                onChange={(e) => setCredentialsData({...credentialsData, new_password: e.target.value})} 
                                required 
                            />
                        </div>
                        <button type="submit" className="edit-submit-btn" disabled={isSubmitting}>
                            {isSubmitting ? 'Updating...' : 'Update Credentials'}
                        </button>
                    </form>
                )}

                {activeTab === 'status' && (
                    <div style={{ textAlign: 'center' }}>
                        <p>Current Status: <strong style={{ color: employee.is_active ? '#2ecc71' : '#e74c3c' }}>
                            {employee.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </strong></p>
                        <button 
                            onClick={handleStatusToggle} 
                            className="status-toggle-btn" 
                            style={{ backgroundColor: employee.is_active ? '#e74c3c' : '#2ecc71' }}
                            disabled={isSubmitting}
                        >
                            {employee.is_active ? 'Deactivate Account' : 'Activate Account'}
                        </button>
                    </div>
                )}

                {errorModal.isOpen && (
                <ErrorMessage
                    subject={errorModal.subject}
                    message={errorModal.message}
                    onReturn={closeErrorModal}
                />
            )}
            </div>
        </div>
    </div>
);}