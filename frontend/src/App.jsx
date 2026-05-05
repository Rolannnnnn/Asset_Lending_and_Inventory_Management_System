import { useState } from 'react';
import './App.css';

import visibilityIcon from './assets/pass_visibility.svg';
import visibilityOffIcon from './assets/pass_visibility_off.svg';
import fbIcon from './assets/facebook_icon.svg';

import {Test} from './tool_modules/test.jsx';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    
    if (username === "admin" && password === "1234") {
      console.log("Login successful!");
      setIsLoggedIn(true);
    } else {
      console.log("Invalid credentials");
      alert("Wrong username or password!");
    }
  };

  if (isLoggedIn) {
    return <Test />;
  }

  return (
    <div className="light-theme"> 
      <div className="header-text" style={{ marginBottom: '30px' }}>
        <h1>Digital Inventory</h1>
      </div>

      <form className="card" onSubmit={handleLogin}>
        <div className="text-box">
          <input 
            type="text" 
            placeholder="Username" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="text-box password-container">
          <input 
            type={showPassword ? "text" : "password"} 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button 
            type="button" 
            className="visibility-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            <img 
              src={showPassword ? visibilityOffIcon : visibilityIcon} 
              alt="toggle" 
            />
          </button>
        </div>

        <button type="submit" className="login-btn">Log In</button>
        
        <button 
          type="button" 
          className="cancel-login-btn" 
          style={{ marginTop: '10px', background: 'transparent', color: 'gray', padding: '14px' }}
          onClick={() => {
            setUsername('');
            setPassword('');
          }}
        >
          Cancel
        </button>
      </form>

      <footer className="footer-layout">
        <div className="read-the-docs">
          For questions and comments, contact us at:{' '}
          <a href="https://www.facebook.com/mis.office.earist" target="_blank" rel="noreferrer">
            <img src={fbIcon} className="footer-icons" alt="Facebook" />
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;