import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function CheckView() {
  const { orderId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate loading for now
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [orderId]);

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <h2>Loading your check...</h2>
          <p>Please wait while we fetch your order details.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Your Check</h2>
        <p><strong>Order ID:</strong> {orderId}</p>
        
        <div style={{ marginTop: '20px' }}>
          <h3>Order Details</h3>
          <p style={{ color: '#6c757d' }}>
            This is where the live receipt will appear once connected to the POS system.
          </p>
          
          <div style={{ 
            border: '2px dashed #ddd', 
            padding: '20px', 
            borderRadius: '8px',
            textAlign: 'center',
            marginTop: '20px'
          }}>
            <p>🚧 Coming in Iteration 2</p>
            <p>POS integration and receipt display</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckView;
