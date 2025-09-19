import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import * as Sentry from '@sentry/react';

interface RouteParams {
  orderId: string; // This is actually the QR-ID now
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: number;
}

interface QRSessionResponse {
  qr_id: string;
  table_number?: string;
  has_order: boolean;
  message?: string;
  order?: Order;
}

const CheckView: React.FC = () => {
  const { orderId } = useParams<keyof RouteParams>() as RouteParams; // This is actually QR-ID
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [qrSession, setQRSession] = useState<QRSessionResponse | null>(null);

  useEffect(() => {
    const fetchQRSession = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8080/api/qr/${orderId}`);
        
        if (!response.ok) {
          throw new Error(`QR session not found: ${response.statusText}`);
        }
        
        const sessionData = await response.json();
        setQRSession(sessionData);
      } catch (err) {
        console.error('Error fetching QR session:', err);
        setError(err instanceof Error ? err.message : 'Failed to load QR session');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchQRSession();
    }
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  return (
    <div className="container">
      <div className="card">
        <h2>🍽️ Tu Cuenta - Las Gaoneras</h2>
        <p><strong>QR ID:</strong> {orderId}</p>
        {qrSession?.table_number && (
          <p><strong>Mesa:</strong> {qrSession.table_number}</p>
        )}
        
        {qrSession && !qrSession.has_order && (
          <div style={{ 
            marginTop: '20px', 
            padding: '20px', 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeeba',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3>⏳ Esperando Orden</h3>
            <p>{qrSession.message}</p>
            <p style={{ fontSize: '14px', color: '#6c757d' }}>
              El personal del restaurante creará tu orden. Por favor espera...
            </p>
          </div>
        )}
        
        {qrSession && qrSession.has_order && qrSession.order && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ 
              borderBottom: '2px solid #e9ecef', 
              paddingBottom: '15px',
              marginBottom: '20px'
            }}>
              <h3>📋 Detalles del Pedido</h3>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              {qrSession.order.items.map((item) => (
                <div key={item.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid #f8f9fa'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>
                      Cantidad: {item.qty}
                    </div>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '16px' }}>
                    {formatPrice(item.price * item.qty)}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ 
              borderTop: '2px solid #e9ecef', 
              paddingTop: '15px',
              marginTop: '20px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#2c3e50'
              }}>
                <span>Total:</span>
                <span>{formatPrice(qrSession.order.total)}</span>
              </div>
            </div>
            
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
            }}>
              <p style={{ margin: '0', color: '#6c757d', fontSize: '14px' }}>
                💡 En las próximas iteraciones podrás seleccionar tus items y pagar tu parte
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sentry.withProfiler(CheckView);
