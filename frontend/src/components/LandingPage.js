import React from 'react';

function LandingPage() {
  return (
    <div className="container">
      <div className="card">
        <h1>Welcome to Munch App</h1>
        <p>Split your restaurant bill with ease!</p>
        
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <h2>🍽️</h2>
          <p>To view your check, scan the QR code at your table</p>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>
            Or visit <strong>/admin/qr</strong> to generate a test QR code
          </p>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
