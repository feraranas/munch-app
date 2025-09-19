import React, { useState, useEffect, useCallback } from 'react';
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
  const [polling, setPolling] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchQRSession = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) {
        setLoading(true);
      } else {
        setPolling(true);
      }
      
      const response = await fetch(`http://localhost:8080/api/qr/${orderId}`);
      
      if (!response.ok) {
        throw new Error(`QR session not found: ${response.statusText}`);
      }
      
      const sessionData = await response.json();
      setQRSession(sessionData);
      setLastUpdated(new Date());
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error fetching QR session:', err);
      if (!isPolling) {
        setError(err instanceof Error ? err.message : 'Failed to load QR session');
      }
      // For polling errors, we don't show error to user, just log it
    } finally {
      if (!isPolling) {
        setLoading(false);
      } else {
        setPolling(false);
      }
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    // Initial fetch
    fetchQRSession(false);

    // Set up polling every 3 seconds
    const interval = setInterval(() => {
      fetchQRSession(true);
    }, 3000);

    setPollingInterval(interval);

    // Cleanup function
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [orderId, fetchQRSession]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

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

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    return lastUpdated.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className="container">
      <div className="card">
        <h2>🍽️ Tu Cuenta - Las Gaoneras</h2>
        <p><strong>QR ID:</strong> {orderId}</p>
        {qrSession?.table_number && (
          <p><strong>Mesa:</strong> {qrSession.table_number}</p>
        )}
        
        {/* Real-time status indicator */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '8px 12px',
          backgroundColor: polling ? '#fff3cd' : '#d4edda',
          border: `1px solid ${polling ? '#ffeeba' : '#c3e6cb'}`,
          borderRadius: '6px',
          fontSize: '12px',
          marginBottom: '15px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: polling ? '#ffc107' : '#28a745',
              animation: polling ? 'pulse 1s infinite' : 'none'
            }}></div>
            <span>{polling ? '🔄 Actualizando...' : '✅ En tiempo real'}</span>
          </div>
          {lastUpdated && (
            <span style={{ color: '#6c757d' }}>
              Última actualización: {formatLastUpdated()}
            </span>
          )}
        </div>
        
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
              El personal del restaurante creará tu orden. La página se actualizará automáticamente cada 3 segundos.
            </p>
            <button
              onClick={() => fetchQRSession(false)}
              disabled={polling}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: polling ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: polling ? 0.6 : 1
              }}
            >
              {polling ? 'Actualizando...' : '🔄 Actualizar ahora'}
            </button>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <p style={{ margin: '0', color: '#6c757d', fontSize: '14px' }}>
                  💡 En las próximas iteraciones podrás seleccionar tus items y pagar tu parte
                </p>
                <button
                  onClick={() => fetchQRSession(false)}
                  disabled={polling}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: polling ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    opacity: polling ? 0.6 : 1
                  }}
                >
                  {polling ? '⏳' : '🔄'}
                </button>
              </div>
              <p style={{ margin: '0', color: '#6c757d', fontSize: '12px' }}>
                🔄 Esta orden se actualiza automáticamente cada 3 segundos si el personal hace cambios
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sentry.withProfiler(CheckView);
