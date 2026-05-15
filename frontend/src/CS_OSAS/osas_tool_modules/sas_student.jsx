
import '../admin_dashboard.css';
import { useState, useEffect } from 'react';
import CONFIG from '../../tool_modules/FETCH_IP.json';
import { ErrorMessage } from '../../tool_modules/error_message.jsx';


export function AdminStudents() {
    const [refreshCounter, setRefreshCounter] = useState(0); // 
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [update, isUpdate] = useState(false);


    const [modal, isModal] = useState(false);
    const [student, setStudent] = useState({
        student_number: '',
        year: '',
        course: '',
        email: '',
        contact_number: '',
        is_active: true,
    });
    // error modals
    const [errorModal, setErrorModal] = useState({ isOpen: false, subject: "", message: "" });
    const closeErrorModal = () => setErrorModal({ ...errorModal, isOpen: false });



    const handleImportStudents = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedExtensions = ['csv', 'xlsx', 'xls'];
        const fileExtension = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
            setErrorModal({ isOpen: true, subject: data.detail?.subject || "Invalid File Type", message: data.detail?.message || "Please upload a CSV or Excel file." });
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('update', update.toString());
        try {
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/students/import/`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            const result = await response.json();
            console.log(result);
            if (response.ok) {
                setErrorModal({ isOpen: true, subject: "Import Success", message: result.detail?.message || "Students imported successfully." });
                setRefreshCounter(prev => prev + 1); // Triggers the refresh
            } else {
                setErrorModal({ isOpen: true, subject: result.detail?.subject || "Import Failed", message: result.detail?.message || "Failed to import students. Please check the file format and try again." });
            }
        } catch (error) {
            console.log("Import error:", error);
            setErrorModal({ isOpen: true, subject: "Import Failed", message: "An error occurred while importing students." });
        } finally {
            setIsLoading(false);
            e.target.value = null; // Reset file input
        }
    };

    const handleSubmitStudent = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            student_number: student.student_number,
            year: parseInt(student.year),
            section : student.section,
            email: student.email,
            contact_number: student.contact_number,
        }
        try {
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/students/edit_detail/`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (response.ok) {
                setErrorModal({ isOpen: true, subject: "Update Success", message: result.detail?.message || "Student credentials updated successfully." });
                setRefreshCounter(prev => prev + 1); // Triggers the refresh
            } else {
                setErrorModal({ isOpen: true, subject: result.detail?.subject || "Update Failed", message: result.detail?.message || "Failed to update student credentials. Please check the input and try again." });
            }
        } catch (error) {
            console.log("Update error:", error);
            setErrorModal({ isOpen: true, subject: "Update Failed", message: "An error occurred while updating student credentials." });
        } finally {
            setIsSubmitting(false);
        }
    };

        const handleStatusToggle = async () => {
            const newStatus = student.is_active;

            const payload = {
                student_number: student.student_number,
                to_active: newStatus
            };
            try {
                const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/students/edit_status/`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    setErrorModal({ isOpen: true, subject: "Status Update Success", message: `Student has been ${newStatus ? 'activated' : 'deactivated'} successfully.` });
                    setRefreshCounter(prev => prev + 1); // Triggers the refresh
                } else {
                    const result = await response.json();
                    setErrorModal({ isOpen: true, subject: result.detail?.subject || "Status Update Failed", message: result.detail?.message || "Failed to update student status. Please try again." });
                }
            } catch (error) {
                console.log("Status update error:", error);
                setErrorModal({ isOpen: true, subject: "Status Update Failed", message: "An error occurred while updating student status." });
            } finally {
                setIsLoading(false);
            }
        };

        return (
        <>
            <div className="view-container">
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <input
                        type="file"
                        id="student-import-input"
                        style={{ display: 'none' }}
                        accept=".xlsx, .xls, .csv"
                        onChange={handleImportStudents}
                    />

                    <button
                        className="nav-link"
                        style={{ backgroundColor: '#3498db', color: 'white' }}
                        onClick={() => document.getElementById('student-import-input').click()}
                        disabled={isLoading}
                    >
                        {isLoading ? "Importing..." : "Import Students (Excel/CSV)"}
                    </button>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#2c3e50', fontWeight: '500' }}>
                        <input 
                            type="checkbox" 
                            checked={Boolean(isUpdate)}
                            onChange={(e) => setIsUpdate(e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        Overwrite existing records
                    </label>
                </div>
            </div>

            {errorModal.isOpen && (
                <ErrorMessage
                    subject={errorModal.subject}
                    message={errorModal.message}
                    onReturn={closeErrorModal}
                />
            )}
        </>
    );
}