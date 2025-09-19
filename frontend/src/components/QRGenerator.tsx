import React, { useState } from 'react';
import * as Sentry from '@sentry/react';
interface QRResponse {
  qrCodeUrl: string;
}

const QRGenerator: React.FC = () => {
  const [orderId, setOrderId] = useState<string>('ORDER-001');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
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

        <button 
          className="btn" 
          onClick={generateQR}
          disabled={loading || !orderId}
        >
          {loading ? 'Generando...' : '📱 Genera QR'}
        </button>

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
          
          <h4>📋 Instrucciones para Generar QR:</h4>
          <ol>
            <li>Primero, crea una orden usando el <a href="/admin/pos" style={{ color: '#007bff' }}>Sistema POS</a></li>
            <li>Copia el ID de la orden creada</li>
            <li>Pega el ID en el campo de arriba</li>
            <li>Haz clic en "📱 Genera QR" para generar el código</li>
            <li>Los clientes pueden escanear el QR para ver su recibo</li>
          </ol>
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#6c757d' }}>
            💡 <strong>Flujo recomendado:</strong> Sistema POS → Crear Orden → Generar QR → Cliente escanea
          </p>
          
        </div>
      </div>
    </div>
  );
};

export default Sentry.withProfiler(QRGenerator);