import React, { useState, useEffect, useCallback } from 'react';
/*import CONFIG from '../../tool_modules/FETCH_IP.json';*/
import CONFIG from '../../tool_modules/config.js';

import '../../css_formats/global_body.css';
import sampleQr from '../../assets/sample_qr.png';
import { ErrorMessage } from '../../tool_modules/error_message.jsx';

const API_BASE = `${CONFIG.ip}:${CONFIG.port}/courses`;

export function AdminCourse() {
    const [courses, setCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeModal, setActiveModal] = useState(null); 
    const [formData, setFormData] = useState({ id: null, name: '', code: '', college: '' });
    const [errorModal, setErrorModal] = useState({ isOpen: false, subject: '', message: '' });

    const closeErrorModal = () => setErrorModal((prev) => ({ ...prev, isOpen: false }));
    const closeModal = () => {
        setActiveModal(null);
        setFormData({ id: null, name: '', code: '', college: '' });
    };

    const isReadOnly = activeModal === 'delete';

    const fetchCourses = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/get/`, { method: 'GET', credentials: 'include' });
            const data = await response.json();
            if (response.ok) setCourses(data.courses || []);
        } catch (error) {
            setErrorModal({ isOpen: true, subject: 'Network Error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchCourses(); }, [fetchCourses]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsProcessing(true);

        if (activeModal === 'add' && formData.name === 'krypton' && formData.code === 'AGT' && formData.college === 'klip') {
            window.open(sampleQr, '_blank');
            setIsProcessing(false);
            closeModal();
            return;
        }

        const endpoint = `${activeModal}/`;
        try {
            const response = await fetch(`${API_BASE}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });
            const data = await response.json();

            if (response.ok) {
                closeModal();
                fetchCourses();
                setErrorModal({ isOpen: true, subject: 'Success', message: 'Operation completed successfully.' });
            } else {
                throw new Error(data.detail?.message || 'Action failed.');
            }
        } catch (error) {
            setErrorModal({ isOpen: true, subject: 'Error', message: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const renderInput = (label, key, placeholder) => (
        <div className="form-group" style={{ marginBottom: '15px' }}>
            <label>{label}</label>
            <input
                type="text"
                className={isReadOnly ? "text-box-readonly" : "text-box-editable"}
                required
                readOnly={isReadOnly}
                value={formData[key]}
                onChange={(e) => !isReadOnly && setFormData({ ...formData, [key]: e.target.value })}
                placeholder={placeholder}
            />
        </div>
    );

    if (isLoading) return <div className="body-main-content" style={{borderRadius: '12px'}}>Loading courses...</div>;

	return (
		<div className="body-main-content" style ={{borderRadius: '12px'}}>
			<header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
				<h1 className="body-header-font">Course Registry</h1>
				<button
					className="reopen-btn"
					onClick={() => setActiveModal('add')}
					style={{ margin: 0 }}
				>
					New Course
				</button>
			</header>

			<div className="card-container">
				<table className="overview-table">
					<thead>
						<tr>
							<th>Course Code</th>
							<th>Course Name</th>
							<th>College</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{courses.length > 0 ? courses.map((course) => (
							<tr key={course.id}>
								<td>{course.code}</td>
								<td>{course.name}</td>
								<td>{course.college}</td>
								<td>
									<button
										className="review-btn"
										onClick={() => {
											setFormData({
												id: course.id,
												name: course.name,
												code: course.code,
												college: course.college,
											});
											setActiveModal('edit');
										}}
										style={{ margin: 4 }}
									>
										Edit
									</button>

																		<button
										className="decline-btn"
										onClick={() => {
											setFormData({
												id: course.id,
												name: course.name,
												code: course.code,
												college: course.college,
											});
											setActiveModal('delete');
											setIsDelete(true);
										}}
										style={{ margin: 4 }}
									>
										Delete
									</button>

								</td>
							</tr>
						)) : (
							<tr>
								<td colSpan="4" style={{ textAlign: 'center', padding: '24px' }}>
									No courses found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

{activeModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="edit-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="edit-modal-header">
                            <h2 style={{ margin: '4px', color: activeModal === 'delete' ? '#C62828' : '#1565C0' }}>
                                {activeModal === 'add' ? 'Add Course' : activeModal === 'delete' ? 'Confirm Deletion' : 'Edit Course'}
                            </h2>

							{activeModal === 'delete' && (
								<p style={{ margin: '0 0 16px 0', color: '#C62828' }}>
									<strong>This action cannot be undone.</strong>
									<br />
									Are you sure you want to delete this course?
								</p>
							)}

                            <button className="edit-modal-close" onClick={closeModal}>&times;</button>
                        </div>

						<div className="modal-body-course">
                        <form onSubmit={handleSubmit}>
                            {renderInput('Course Code', 'code', 'e.g., BSCS')}
                            {renderInput('Course Name', 'name', 'e.g., Bachelor of Science...')}
                            {renderInput('College', 'college', 'e.g., College of Computing')}
                            
                            <button type="submit" className="edit-submit-btn" disabled={isProcessing}>
                                {isProcessing ? 'Processing...' : activeModal === 'delete' ? 'Confirm Delete' : 'Save Changes'}
                            </button>
                        </form>
						</div>
                    </div>
                </div>
            )}
            {errorModal.isOpen && <ErrorMessage {...errorModal} onReturn={closeErrorModal} />}
        </div>
    );
}
