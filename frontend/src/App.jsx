import React from 'react';
import './App.css';
import fbIcon from './assets/facebook_icon.svg';


function App() {
    return (
      <div>
        <div className="header-text" style={{ marginBottom: '30px' }}>
            <h1>Digital Inventory</h1>
        </div>

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