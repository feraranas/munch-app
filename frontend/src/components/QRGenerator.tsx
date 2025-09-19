import React, { useState } from 'react';
import * as Sentry from '@sentry/react';
interface QRResponse {
  qrCodeUrl: string;
}

const QRGenerator: React.FC = () => {
  const [orderId, setOrderId] = useState<string>('ORDER-001');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [mockOrderCreated, setMockOrderCreated] = useState<boolean>(false);

  const createMockOrder = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/pos/mock-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrderId(data.id);
        setMockOrderCreated(true);
        alert(`Mock order created with ID: ${data.id}`);
      } else {
        alert('Failed to create mock order');
      }
    } catch (error) {
      console.error('Error creating mock order:', error);
      alert('Error connecting to backend. Make sure the Go server is running on port 8080.');
    }
    setLoading(false);
  };
  
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
        const data: QRResponse = await response.json();
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderId(e.target.value)}
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

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            className="btn" 
            onClick={createMockOrder}
            disabled={loading}
            style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}
          >
            {loading ? 'Creando...' : '🍽️ Crear Orden Mock'}
          </button>
          
          <button 
            className="btn" 
            onClick={generateQR}
            disabled={loading || !orderId}
          >
            {loading ? 'Generando...' : '📱 Genera QR'}
          </button>
        </div>

        {mockOrderCreated && (
          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            backgroundColor: '#d4edda', 
            border: '1px solid #c3e6cb',
            borderRadius: '4px',
            color: '#155724'
          }}>
            ✅ Mock order created! Now generate a QR code to view it.
          </div>
        )}

        {qrCodeUrl && (
          <div style={{ marginTop: '30px' }}>
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
          
          <ol>
            <li>Make sure the Go backend is running on port 8080</li>
            <li>Click "🍽️ Crear Orden Mock" to create a sample restaurant order</li>
            <li>Click "📱 Genera QR" to generate a QR code for that order</li>
            <li>Scan the QR code or visit: <code>{checkUrl}</code></li>
            <li>You'll see the full receipt with items, prices, and total!</li>
          </ol>
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#6c757d' }}>
            💡 This demonstrates the POS integration and receipt display from Iteration 2
          </p>
          
        </div>
      </div>
    </div>
  );
};

export default Sentry.withProfiler(QRGenerator);