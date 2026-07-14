import '../osas_dashboard.css';
import { useState, useEffect } from 'react';
/*import CONFIG from '../../tool_modules/FETCH_IP.json';*/
import CONFIG from '../../tool_modules/config.js';
import { ErrorMessage } from '../../tool_modules/error_message.jsx';
import '../../css_formats/global_body.css'

export function OsasStudents() {
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [studentLists, setStudentLists] = useState([]);
    const [activeTab, setActiveTab] = useState('details');

    const [searchTerm, setSearchTerm] = useState('');

    const [modal, isModal] = useState(false);
    const [student, setStudent] = useState({
        student_number: '',
        year: '',
        section: '',
        email: '',
        contact_number: '',
        is_active: true,
    });

    const [errorModal, setErrorModal] = useState({ isOpen: false, subject: "", message: "" });
    const closeErrorModal = () => setErrorModal({ ...errorModal, isOpen: false });

    const [dataModal, setDataModal] = useState(false);

    // --- NEW: EXPORT FUNCTION ---
    const handleExport = () => {
        if (studentLists.length === 0) return;

        // Define CSV headers
        const headers = ["Student No.", "Name", "Course Code", "Year", "Section", "Email", "Contact", "Status"];

        // Map data rows
        const rows = studentLists.map(s => [
            s.student_number,
            `"${s.name || ""}"`, // Wrap in quotes to handle commas in names
            s.course_code,
            s.year,
            s.section,
            s.email,
            s.contact_number,
            s.is_active ? "Active" : "Inactive"
        ]);

        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `student_list_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    useEffect(() => {
        const fetchStudents = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/students/get_all/`, {
                    method: 'GET',
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    setStudentLists(data.students || []);
                } else {
                    const errorData = await response.json();
                    setErrorModal({ isOpen: true, subject: errorData.detail?.subject || "Fetch Failed", message: errorData.detail?.message || "Failed to load students. Please try again later." });
                }
            } catch (error) {
                console.error("Error fetching students:", error);
                setErrorModal({ isOpen: true, subject: "Fetch Failed", message: "An error occurred while fetching students." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchStudents();
    }, [refreshCounter]);


    const handleImportStudents = async (e) => {
        const file = e.target.files[0];
        if (!file) return;


        const allowedExtensions = ['csv', 'xlsx', 'xls'];
        const fileExtension = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
            setErrorModal({ isOpen: true, subject: "Invalid File Type", message: "Please upload a CSV or Excel file." });
            return;
        }


        const formData = new FormData();
        formData.append('file', file);
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
            section: student.section,
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
            const response = await fetch(`${CONFIG.ip}:${CONFIG.port}/students/edit_status`, {
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

    const filteredStudents = studentLists.filter((student) => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = student.name?.toLowerCase().includes(searchLower);
    const idMatch = student.student_number?.toString().toLowerCase().includes(searchLower);
    
    return nameMatch || idMatch;
});


    return (
        
        <div className="main-dashboard-container" style={{paddingTop: '0px'}}>
            <div className="view-container" style={{paddingTop: '26px'}}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '21px' }}>
                    <h2 style={{ margin: 0, color: '#2c3e50' }}>Student Directory</h2>

                    <div className="search-container">
                        <input
                            type="text"
                            placeholder="Search by Name or ST Num..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>

                    <button
                        className="accept-btn"
                        onClick={() => setDataModal(true)}
                        style={{ padding: '10px 20px', cursor: 'pointer' }}
                    >
                        Import / Export
                    </button>

                </div>

                {/* --- DATA MANAGEMENT MODAL --- */}
                {dataModal && (
                    <div className="modal-overlay" onClick={() => setDataModal(false)}>
                        <div className="edit-modal-container" onClick={(e) => e.stopPropagation()}>
                            
                            <div className="edit-modal-header">
                                <h2 className="edit-modal-title">Data Management</h2>
                                <button className="edit-modal-close" onClick={() => setDataModal(false)}>&times;</button>
                            </div>

                            <div className="edit-form-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <input
                                    type="file"
                                    id="student-import-input"
                                    style={{ display: 'none' }}
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleImportStudents}
                                />

                                <button
                                    className="review-btn"
                                    style={{ width: '100%' }}
                                    onClick={() => document.getElementById('student-import-input').click()}
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Importing..." : "Import Students (Excel/CSV)"}
                                </button>

                                <hr style={{ width: '100%', border: '0', borderTop: '1px solid #ddd', margin: '10px 0' }} />

                                <button
                                    className="accept-btn"
                                    style={{ width: '100%' }}
                                    onClick={handleExport}
                                    disabled={studentLists.length === 0}
                                >
                                    Export Students (Excel/CSV)
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                <div className='ticket-list-wrapper'>
                        <table className="overview-table">
                            <thead>
                                <tr>
                                    <th>ST Num</th>
                                    <th>Name</th>
                                    <th>Course/Year/Sec</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents && filteredStudents.length > 0 ? (
                                    filteredStudents.map((row) => (
                                        <tr key={row.student_number}>
                                            <td>{row.student_number}</td>
                                            <td>{row.name}</td>
                                            <td>{row.course_code} {row.year}- {row.section}</td>
                                            <td>
                                                <span className={`status-pill ${row.is_active ? 'completed' : 'to-do'}`}>
                                                    {row.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    className="review-btn"
                                                    onClick={() => {
                                                        // Populate the modal with the clicked row's data
                                                        setStudent({
                                                            student_number: row.student_number,
                                                            year: row.year || '',
                                                            course_code: row.course_code || '',
                                                            section: row.section || '',
                                                            email: row.email || '',
                                                            contact_number: row.contact_number || '',
                                                            is_active: row.is_active
                                                        });
                                                        setActiveTab('details');
                                                        isModal(true);
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
                                            No student records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            {/* --- 3. EDIT STUDENT MODAL --- */}
            {modal && (
                <div className="modal-overlay" onClick={() => isModal(false)}>
                    <div className="edit-modal-container" onClick={(e) => e.stopPropagation()}>

                        <div className="edit-modal-header">
                            <h2 className="edit-modal-title">Edit Student: {student.student_number}</h2>
                            <button className="edit-modal-close" onClick={() => isModal(false)}>&times;</button>
                        </div>


                        <div className="modal-tabs">
                            <button
                                className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                                onClick={() => setActiveTab('details')}
                            >
                                <strong>Student Details</strong>
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
                                onClick={() => setActiveTab('status')}
                            >
                                <strong>Account Status</strong>
                            </button>
                        </div>


                        <div className="edit-form-container">

                            {/* TAB 1: DETAILS */}
                            {activeTab === 'details' && (
                                <form onSubmit={handleSubmitStudent}>
                                    <div className="form-group" style={{ marginBottom: '15px' }}>
                                        <label>Year Level</label>
                                        <input
                                            type="number"
                                            className="text-box-editable"
                                            value={student.year}
                                            onChange={(e) => setStudent({ ...student, year: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '15px' }}>
                                        <label>Section / Course</label>
                                        <input
                                            type="text"
                                            className="text-box-editable"
                                            value={student.section}
                                            onChange={(e) => setStudent({ ...student, section: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '15px' }}>
                                        <label>Email Address</label>
                                        <input
                                            type="email"
                                            className="text-box-editable"
                                            value={student.email}
                                            onChange={(e) => setStudent({ ...student, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '15px' }}>
                                        <label>Contact Number (Optional)</label>
                                        <input
                                            type="text"
                                            className="text-box-editable"
                                            value={student.contact_number || ''}
                                            onChange={(e) => setStudent({ ...student, contact_number: e.target.value })}
                                        />
                                    </div>
                                    <button type="submit" className="edit-submit-btn" disabled={isSubmitting}>
                                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </form>
                            )}


                            {/* TAB 2: STATUS */}
                            {activeTab === 'status' && (
                                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                    <p style={{ marginBottom: '20px', fontSize: '1.1rem' }}>
                                        Current Status: <strong style={{ color: student.is_active ? '#2ecc71' : '#e74c3c' }}>
                                            {student.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </strong>
                                    </p>
                                    <button
                                        onClick={handleStatusToggle}
                                        className="status-toggle-btn"
                                        style={{
                                            backgroundColor: student.is_active ? '#e74c3c' : '#2ecc71',
                                            padding: '12px',
                                            width: '100%',
                                            border: 'none',
                                            borderRadius: '5px',
                                            color: 'white',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                        disabled={isLoading}
                                    >
                                        {student.is_active ? 'Deactivate Student' : 'Activate Student'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* --- 4. GLOBAL ERROR/SUCCESS MODAL --- */}
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

