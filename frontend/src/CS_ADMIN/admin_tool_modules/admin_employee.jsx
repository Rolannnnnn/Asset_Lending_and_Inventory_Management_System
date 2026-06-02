import React, { useState, useEffect } from 'react';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import '../admin_dashboard.css';
import '../../css_formats/global_body.css';
import { ErrorMessage } from '../../tool_modules/error_message.jsx';

import passVisibilityOn from '../../assets/pass_visibility.svg';
import passVisibilityOff from '../../assets/pass_visibility_off.svg';  

export function EmployeeTable({ employees, onEditClick }) {

    if (!employees || employees.length === 0) {
        return <p>No employees found.</p>;
    }

    return (
        <div className="ticket-list-wrapper">
            <table className="overview-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Contact</th>
                        <th>Status</th>
                        <th>Actions</th> 
                    </tr>
                </thead>
                <tbody>
                    {employees.map((emp) => (
                        <tr key={emp.id} className="clickable-row">
                            <td>{emp.name}</td>
                            <td>
                                <span className={`status-pill ${emp.role === 'ADMIN' ? 'to-do' : 'completed'}`}>
                                    {emp.role}
                                </span>
                            </td>
                            <td>{emp.username}</td>
                            <td>{emp.email}</td>
                            <td>{emp.contact_number || 'N/A'}</td>
                            <td>
                                <span className={`status-pill ${emp.is_active ? 'completed' : 'to-do'}`}>
                                    {emp.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>
                                <button 
                                    onClick={() => onEditClick(emp)} 
                                    className="update-btn"
                                    style={{ height: '32px', padding: '4px 12px' }}
                                >
                                    Edit
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function AdminEmployee({ onClose, onSuccess }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        role: 'ADMIN', 
        username: '',
        password: '',
        email: '',
        contact_number: ''
    });

    const [errorModal, setErrorModal] = useState({ isOpen: false, subject: "", message: "" });
    const closeErrorModal = () => setErrorModal({ ...errorModal, isOpen: false });

    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
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
         <div className="body-main-content" style={{ borderRadius: '12px' }}>
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="body-header-font3" style={{ paddingBottom: 0 }}>Register New Employee</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="description-body">
                        <div className="description-body" style={{ display: 'grid', gap: '12px', background: 'transparent', padding: 0 }}>
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
                            </div>
                            <div className="description-body">
                            <div>
                                <label>Email Address</label>
                                <input name="email" type="email" className="text-box-editable" value={formData.email} onChange={handleChange} required />
                            </div>
                            </div>

                            <div className="description-body">
                                <label>Username</label>
                                <input name="username" className="text-box-editable" value={formData.username} onChange={handleChange} required />

                                <label style={{ marginTop: '10px' }}>Password</label>
                                    <div className="password-wrapper">
                                        <input
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            className="text-box-editable"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                        />
                                        <img
                                            src={showPassword ? passVisibilityOff : passVisibilityOn}
                                            alt={showPassword ? "Hide password" : "Show password"}
                                            className="password-toggle-icon"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{ filter: 'brightness(0) saturate(100%) invert(20%) sepia(58%) saturate(321%) hue-rotate(169deg) brightness(96%) contrast(93%)' }}
                                        />
                                    </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer" style={{ gap: '8px' }}>
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="accept-btn" disabled={isSubmitting}>
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
        </div>
    );
}

export function AdminEditEmployee({ employee, onClose, onSuccess }) {
    const [activeTab, setActiveTab] = useState('details'); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusConfirmModal, setStatusConfirmModal] = useState({ isOpen: false, nextStatus: false });

    const [errorModal, setErrorModal] = useState({ isOpen: false, subject: "", message: "" });
    const closeErrorModal = () => setErrorModal({ ...errorModal, isOpen: false });
    const closeStatusConfirmModal = () => setStatusConfirmModal({ isOpen: false, nextStatus: false });
    
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
                if (onSuccess) onSuccess();
            } else {
                setErrorModal({ isOpen: true, subject: "Update Error", message: data.detail?.message || "Failed to update employee details." });
            }
        } catch (err) {
            setErrorModal({ isOpen: true, subject: "Network Error", message: "Could not connect to backend." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusToggle = async (nextStatus) => {
        setIsSubmitting(true);
        try {
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/accounts/edit_status/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    account_id: employee.id,
                    to_active: nextStatus
                }),
            });
            const data = await response.json();

            if (response.ok) {
                setStatusConfirmModal({ isOpen: false, nextStatus: false });
                setErrorModal({ isOpen: true, subject: "Update Success", message: data.detail?.message || `Account successfully ${nextStatus ? 'activated' : 'deactivated'}!` });
                if (onSuccess) onSuccess();
            } else {
                setErrorModal({ isOpen: true, subject: "Update Error", message: data.detail?.message || "Failed to update status." });
            }
        } catch (err) {
            setErrorModal({ isOpen: true, subject: "Network Error", message: "Could not connect to backend." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openStatusConfirmModal = () => {
        setStatusConfirmModal({ isOpen: true, nextStatus: !employee.is_active });
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
                if (onSuccess) onSuccess();
            } else {
                setErrorModal({ isOpen: true, subject: "Update Error", message: data.detail?.message || "Failed to update credentials." });
            }
        } catch (err) {
            setErrorModal({ isOpen: true, subject: "Network Error", message: "Could not connect to backend." });
        } finally {
            setIsSubmitting(false);
        }
    };
    return (
         <div className="body-main-content" style={{ borderRadius: '12px' }}>
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                
                <div className="modal-header">
                    <h2 className="body-header-font3" style={{ paddingBottom: 0 }}>Edit Employee: {employee.name}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <div className="tabs-container">
                    <button 
                        type="button"
                        className={`tab-item ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                    >
                        Profile Details
                    </button>
                    <button 
                        type="button"
                        className={`tab-item ${activeTab === 'credentials' ? 'active' : ''}`}
                        onClick={() => setActiveTab('credentials')}
                    >
                        Credentials
                    </button>
                    <button 
                        type="button"
                        className={`tab-item ${activeTab === 'status' ? 'active' : ''}`}
                        onClick={() => setActiveTab('status')}
                    >
                        Account Status
                    </button>
                </div>

                <div className="modal-body" style={{ background: '#ffffff', borderTop: 'none' }}>
                    {activeTab === 'details' && (
                        <form onSubmit={handleDetailsSubmit} style={{ display: 'grid', gap: '16px' }}>
                            <div className="description-body" style={{ background: 'transparent', padding: 0 }}>
                                <label>Full Name</label>
                                <input 
                                    className="text-box-editable" 
                                    value={detailsData.name} 
                                    onChange={(e) => setDetailsData({...detailsData, name: e.target.value})} 
                                    required 
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="description-body" style={{ background: 'transparent', padding: 0 }}>
                                    <label>Role</label>
                                    <select
                                        className="text-box-editable"
                                        value={detailsData.role}
                                        onChange={(e) => setDetailsData({ ...detailsData, role: e.target.value })}
                                        required
                                    >
                                        <option value="ADMIN">ADMIN</option>
                                        <option value="PMS">PMS</option>
                                        <option value="SAS">SAS</option>
                                    </select>
                                </div>
                                <div className="description-body" style={{ background: 'transparent', padding: 0 }}>
                                    <label>Contact Number</label>
                                    <input
                                        className="text-box-editable"
                                        value={detailsData.contact_number}
                                        onChange={(e) => setDetailsData({ ...detailsData, contact_number: e.target.value })}
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>
                            <div className="description-body" style={{ background: 'transparent', padding: 0 }}>
                                <label>Email Address</label>
                                <input 
                                    type="email" 
                                    className="text-box-editable" 
                                    value={detailsData.email} 
                                    onChange={(e) => setDetailsData({...detailsData, email: e.target.value})} 
                                    required 
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                                <button type="submit" className="update-btn" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'credentials' && (
                        <form onSubmit={handleCredentialsSubmit} style={{ display: 'grid', gap: '16px' }}>
                            <div className="description-body" style={{ background: 'transparent', padding: 0 }}>
                                <label>New Username</label>
                                <input 
                                    className="text-box-editable" 
                                    value={credentialsData.new_username} 
                                    onChange={(e) => setCredentialsData({...credentialsData, new_username: e.target.value})} 
                                    required 
                                />
                            </div>
                            <div className="description-body" style={{ background: 'transparent', padding: 0 }}>
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
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                                <button type="submit" className="review-btn" disabled={isSubmitting}>
                                    {isSubmitting ? 'Updating...' : 'Update Credentials'}
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'status' && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <p className="body-content-text3">
                                Current Status: &nbsp;
                                <span className={`status-pill ${employee.is_active ? 'completed' : 'to-do'}`}>
                                    {employee.is_active ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                            </p>
                            <button 
                                onClick={openStatusConfirmModal} 
                                className={employee.is_active ? "decline-btn" : "accept-btn"} 
                                disabled={isSubmitting}
                                style={{ marginTop: '12px', width: '200px' }}
                            >
                                {employee.is_active ? 'Deactivate Account' : 'Activate Account'}
                            </button>
                        </div>
                    )}

                    {statusConfirmModal.isOpen && (
                        <div className="modal-overlay" onClick={closeStatusConfirmModal}>
                            <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '460px' }}>
                                <div className="modal-header" style={{ backgroundColor: '#740A03', borderBottom: '1px solid #5f0802' }}>
                                    <h2 className="body-header-font3" style={{ color: '#fff', paddingBottom: 0, margin: 0 }}>Confirm Status Change</h2>
                                    <button onClick={closeStatusConfirmModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#fff' }}>&times;</button>
                                </div>

                                <div className="modal-body">
                                    <div className="description-body" style={{ background: 'transparent', padding: 0 }}>
                                        <p style={{ margin: 0, lineHeight: 1.6 }}>
                                            Are you sure you want to {statusConfirmModal.nextStatus ? 'ACTIVATE' : 'DEACTIVATE'} this account?
                                        </p>
                                    </div>
                                </div>

                                <div className="modal-footer" style={{ gap: '8px' }}>
                                    <button
                                        type="button"
                                        className={statusConfirmModal.nextStatus ? 'accept-btn' : 'decline-btn'}
                                        onClick={() => handleStatusToggle(statusConfirmModal.nextStatus)}
                                        disabled={isSubmitting}
                                        style={{ margin: 0 }}
                                    >
                                        {isSubmitting ? 'Processing...' : 'OK'}
                                    </button>
                                    <button type="button" className="cancel-btn" onClick={closeStatusConfirmModal} disabled={isSubmitting}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>
                        Close Window
                    </button>
                </div>
            </div> 
            {errorModal.isOpen && (
                <ErrorMessage
                    subject={errorModal.subject}
                    message={errorModal.message}
                    onReturn={closeErrorModal}
                />
            )}
        </div>
        </div>
    );
}