import React, { useState } from 'react';
import * as Sentry from '@sentry/react';
import Logo from './Logo';
import { createQRSession, CreateQRSessionResponse } from '../services/api';

const QRGenerator: React.FC = () => {
  const [tableNumber, setTableNumber] = useState<string>('');
  const [qrSession, setQrSession] = useState<CreateQRSessionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const data = await createQRSession({ tableNumber: tableNumber.trim() });
      setQrSession(data);
    } catch (error) {
      console.error('Error creating QR session:', error);
      alert(error instanceof Error ? error.message : 'Failed to create QR session');
    }
    setLoading(false);
  };

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <Logo width={50} height={50} />
          <h2 style={{ marginLeft: '12px', margin: '0' }}>🖼️ Generador de QR Permanente</h2>
        </div>
        <p>Crea códigos QR permanentes para mesas del restaurante.</p>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Número de Mesa (Opcional):
          </label>
          <input
            type="text"
            value={tableNumber}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTableNumber(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e9ecef',
              borderRadius: '8px',
              fontSize: '16px'
            }}
            placeholder="Ej: Mesa 1, Mesa A, Terraza 5"
          />
        </div>

        <button 
          className="btn" 
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? 'Creando QR...' : '🖼️ Crear QR Permanente'}
        </button>

        {qrSession && (
          <div style={{ marginTop: '30px' }}>
            <h3>✅ QR Permanente Creado!</h3>
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <p><strong>QR-ID:</strong> <code style={{ backgroundColor: '#e9ecef', padding: '4px 8px', borderRadius: '4px' }}>{qrSession.qrId}</code></p>
              {qrSession.tableNumber && <p><strong>Mesa:</strong> {qrSession.tableNumber}</p>}
              <p><strong>URL del Cliente:</strong> <code>{qrSession.checkUrl}</code></p>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <img 
                src={qrSession.qrCodeUrl} 
                alt="QR Code" 
                style={{ maxWidth: '300px', height: 'auto', border: '2px solid #e9ecef', borderRadius: '8px' }}
              />
              <p style={{ marginTop: '15px', fontSize: '14px', color: '#6c757d' }}>
                💡 Este QR es permanente y se puede imprimir para la mesa
              </p>
            </div>
            
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#d1ecf1', 
              border: '1px solid #bee5eb',
              borderRadius: '8px'
            }}>
              <h4 style={{ margin: '0 0 10px 0' }}>🔗 Cómo usar este QR:</h4>
              <ol style={{ margin: '0', paddingLeft: '20px' }}>
                <li>Copia el <strong>QR-ID</strong> de arriba</li>
                <li>Ve al <a href="/admin/pos" style={{ color: '#007bff' }}>Sistema POS</a></li>
                <li>Pega el QR-ID y crea órdenes para esta mesa</li>
                <li>Los clientes verán las órdenes automáticamente al escanear</li>
              </ol>
            </div>
          </div>
        )}

        <div style={{ 
          marginTop: '30px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px' 
        }}>
          <h4>📋 Nuevo Sistema de QR Permanente:</h4>
          <ul>
            <li><strong>QR Permanente:</strong> Cada QR se mantiene igual siempre</li>
            <li><strong>Contenido Dinámico:</strong> Las órdenes cambian, pero el QR no</li>
            <li><strong>Seguro:</strong> Solo el personal puede crear órdenes con QR-ID válido</li>
            <li><strong>Eficiente:</strong> Una vez impreso, el QR funciona para siempre</li>
          </ul>
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#6c757d' }}>
            💡 <strong>Flujo:</strong> Crear QR → Imprimir → Personal usa QR-ID → Cliente escanea
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sentry.withProfiler(QRGenerator);