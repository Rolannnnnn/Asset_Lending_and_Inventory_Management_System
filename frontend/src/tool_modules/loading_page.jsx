import React from 'react';
import logo from '../assets/OSAS_logo.svg';
import background from '../assets/loading_bg_page.png';
import './loading_page.css';

export function LoadingPage() {
  return (
    <div 
      className="loading-container" 
      style={{ backgroundImage: `url(${background})` }}
    >
      <div className="loader-wrapper">
        <img src={logo} className="spinning-logo" alt="OSAS Logo" />
        <p className="loading-text">Loading...</p>
      </div>
    </div>
  );
}

export default LoadingPage;