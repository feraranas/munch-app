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
    }, 2000);

    return () => clearTimeout(timer);
  }, [orderId]);

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <h2>Cargando tu cuenta...</h2>
          <p>Porfavor espera mientras preparamos los detalles de tu cuenta.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <h2>Error, llama al mesero</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Tu cuenta</h2>
        <p><strong>Orden ID:</strong> {orderId}</p>
        
        <div style={{ marginTop: '20px' }}>
          <h3>Detalles</h3>
          <p style={{ color: '#6c757d' }}>
            Aqui es donde estará el recibo en tiempo real una vez que nos conectemos al POS (Point of Sale) del restaurante.
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
