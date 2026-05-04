import '../App.css';
import server_down_img from '../assets/server_down.svg'; 
import './error_message.css';

export function ErrorMessage({ onReturn, subject, message, onConfirm }) {

  const MessageTitle = subject === "Success!" ? "#4caf50" : "#e60000"; 

  return (
    <div className="overlay_card">
      <div className="card" style={{ padding: '2rem', maxWidth: '400px', width: '100%' }}>
        
        <h2 
          className="body-header-font" 
          style={{ border: 'none', color: MessageTitle, marginBottom: '10px' }}
        >
          {subject}
        </h2>

        <p className="body-content-text" style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
          {message}
        </p>

        <button
          className="login-btn"
          onClick={() => {
            if (onConfirm) onConfirm(); 
            onReturn();                 
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}

export function AccRoleNotFound({ role, handleLogout, name }) { 
  const MessageTitle = subject === "Success!" ? "#4caf50" : "#e60000"; 
  
  return (
    <div className="card" style={{ textAlign: 'center', padding: '20px' }}> 
      <h2 style={{ fontSize: '2rem' }}>ಥ_ಥ</h2>
      <p className="body-content-text">
        The account for <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>{name}</span> has an 
        invalid role: <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>{role}</span>. 
      </p>
      <p className="body-content-text" style={{ fontSize: '0.9rem', color: '#888' }}>
        Please contact the MIS administrator to update your permissions.
      </p>
      <button 
        className="login-btn"
        onClick={handleLogout}
        style={{ marginTop: '15px' }}
      >
        Log Out
      </button>
    </div>
  );
}

export function AccNotFound({ onReturn, subject, message }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '2rem' }}> 
      <h2 className="body-header-font" style={{ border: 'none', color: '#e60000', marginBottom: '10px' }}>
        {subject || "Account Error"}
      </h2>
      <p className="body-content-text" style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
        {message || "We couldn't find an account matching those credentials."}
      </p>
      <button className="login-btn" onClick={onReturn}>Return to Login</button>
    </div>
  );
}

export function DBNotFound({ onReturn, subject, message }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <h2 className="body-header-font" style={{ border: 'none', color: '#e60000', marginBottom: '10px' }}>
          {subject || "Database Offline"}
        </h2>
        <p className="body-content-text" style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
          {message || "The system is currently unable to reach the database. Please try again later."}
        </p>
        <button className="login-btn" onClick={onReturn}>
          Try Again
        </button>
      </div>
    </div>
  );
}