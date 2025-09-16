import React, { useState } from 'react';

function QRGenerator() {
  const [orderId, setOrderId] = useState('ORDER-001');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const generateQR = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/qr/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setQrCodeUrl(data.qrCodeUrl);
      } else {
        alert('Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Error connecting to backend. Make sure the Go server is running on port 8080.');
    }
    setLoading(false);
  };

  const checkUrl = `${window.location.origin}/check/${orderId}`;

  return (
    <div className="container">
      <div className="card">
        <h2>Generador de QR</h2>
        <p>Genera códigos QR para recibos y mesas de restaurante.</p>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            Orden ID:
          </label>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
            placeholder="Ingresa el ID de la orden"
          />
        </div>

        <button 
          className="btn" 
          onClick={generateQR}
          disabled={loading || !orderId}
        >
          {loading ? 'Generando...' : 'Genera un código QR'}
        </button>

        {qrCodeUrl && (
          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <h3>Codigo QR Generado!</h3>
            <img 
              src={qrCodeUrl} 
              alt="QR Code" 
              style={{ maxWidth: '300px', height: 'auto' }}
            />
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#6c757d' }}>
                Escanea este código QR para ver la cuenta: <br />
              <code>{checkUrl}</code>
            </p>
          </div>
        )}

        <div style={{ 
          marginTop: '30px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px' 
        }}>
          <h4>Instrucciones:</h4>
          <ol>
            <li>Make sure the Go backend is running on port 8080</li>
            <li>Enter an order ID and click "Generate QR Code"</li>
            <li>The QR code will link to: <code>/check/{orderId}</code></li>
            <li>Customers can scan this to view their check</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default QRGenerator;
