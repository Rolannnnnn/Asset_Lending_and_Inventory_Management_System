import React, { useState, useEffect, useCallback } from 'react';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import '../../css_formats/global_body.css';
import { ErrorMessage } from '../../tool_modules/error_message.jsx';

const API_BASE = `${CONFIG.ip}:${CONFIG.port}/courses`;

export function SASCourse() {
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

	const fetchCourses = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await fetch(`${API_BASE}/get/`, {
				method: 'GET',
				credentials: 'include',
			});
			const data = await response.json();

			if (response.ok) {
				setCourses(data.courses || []);
			} else {
				setErrorModal({
					isOpen: true,
					subject: data.detail?.subject || 'Fetch Failed',
					message: data.detail?.message || 'Could not load courses.'
				});
			}
		} catch (error) {
			setErrorModal({
				isOpen: true,
				subject: 'Network Error',
				message: error.message
			});
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchCourses();
	}, [fetchCourses]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsProcessing(true);

		const isEdit = activeModal === 'edit';
		const endpoint = isEdit ? 'edit/' : 'add/';

		try {
			const payload = {
				name: formData.name,
				code: formData.code,
				college: formData.college,
			};

			if (isEdit) {
				payload.id = formData.id;
			}

			const response = await fetch(`${API_BASE}/${endpoint}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload),
			});

			const data = await response.json();

			if (response.ok) {
				closeModal();
				fetchCourses();
				setErrorModal({
					isOpen: true,
					subject: isEdit ? 'Update Success' : 'Add Success',
					message: isEdit ? 'Course updated successfully.' : 'Course added successfully.'
				});
			} else {
				setErrorModal({
					isOpen: true,
					subject: data.detail?.subject || 'Save Failed',
					message: data.detail?.message || 'Could not save course.'
				});
			}
		} catch (error) {
			setErrorModal({
				isOpen: true,
				subject: 'Network Error',
				message: error.message
			});
		} finally {
			setIsProcessing(false);
		}
	};

	if (isLoading) {
		return (
			<div className="body-main-content">
				<p className="p-4">Loading courses...</p>
			</div>
		);
	}

	return (
		<div className="body-main-content">
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
										style={{ margin: 0 }}
									>
										Edit
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
							<h2 className="edit-modal-title">
								{activeModal === 'add' ? 'Add New Course' : 'Edit Course: ' + formData.code}
							</h2>
							<button className="edit-modal-close" onClick={closeModal}>&times;</button>
						</div>

						<div className="edit-form-container">
							<form onSubmit={handleSubmit}>
								<div className="form-group" style={{ marginBottom: '15px' }}>
									<label>Course Code</label>
									<input
										type="text"
										className="text-box-editable"
										required
										value={formData.code}
										onChange={(e) => setFormData({ ...formData, code: e.target.value })}
										placeholder="e.g., BSCS"
									/>
								</div>

								<div className="form-group" style={{ marginBottom: '15px' }}>
									<label>Course Name</label>
									<input
										type="text"
										className="text-box-editable"
										required
										value={formData.name}
										onChange={(e) => setFormData({ ...formData, name: e.target.value })}
										placeholder="e.g., Bachelor of Science in Computer Science"
									/>
								</div>

								<div className="form-group" style={{ marginBottom: '15px' }}>
									<label>College</label>
									<input
										type="text"
										className="text-box-editable"
										required
										value={formData.college}
										onChange={(e) => setFormData({ ...formData, college: e.target.value })}
										placeholder="e.g., College of Computing Studies"
									/>
								</div>

								<button type="submit" className="edit-submit-btn" disabled={isProcessing}>
									{isProcessing ? 'Processing...' : 'Save Changes'}
								</button>
							</form>
						</div>
					</div>
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
	);
}
