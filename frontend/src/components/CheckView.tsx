import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { useWebSocket } from '../hooks/useWebSocket';
import CollaborativeUsers from './MockProfile';
import OrderItemsList from './OrderItemsList';
import ModalSheet from './ModalSheet';
import { api } from '../config/environment';

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
  // const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false);
  const [totalPaid, setTotalPaid] = useState<number>(0);
  
  // Initialize WebSocket connection for this QR session
  const { isConnected,
          connectionError, 
          connectedUsers,
          itemSelections,
          totalPaidByGroup,
          sendItemSelection,
          sendPaymentConfirmation 
        } = useWebSocket({ qrSessionId: orderId || '' });

  const fetchQRSession = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) {
        setLoading(true);
      } else {
        setPolling(true);
      }
      
      const response = await fetch(api.qr(orderId));
      
      if (!response.ok) {
        throw new Error(`QR session not found: ${response.statusText}`);
      }
      
      const sessionData = await response.json();
      setQRSession(sessionData);
      // setLastUpdated(new Date());
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
    // TODO: Optimize or think of a more intelligent strategy
    const interval = setInterval(() => {
      fetchQRSession(true);
    }, 10000);

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

  // const formatLastUpdated = () => {
  //   if (!lastUpdated) return '';
  //   return lastUpdated.toLocaleTimeString('es-MX', { 
  //     hour: '2-digit', 
  //     minute: '2-digit', 
  //     second: '2-digit' 
  //   });
  // };

  const calculateMyTotal = () => {
    if (!qrSession?.order?.items) return 0;
    
    return qrSession.order.items
      .filter(item => selectedItems.has(item.id))
      .reduce((total, item) => total + (item.price * item.qty), 0);
  };

  const calculateRemainingBalance = () => {
    if (!qrSession?.order?.total) return 0;
    return qrSession.order.total - (totalPaid + totalPaidByGroup);
  };

  const handlePayment = () => {
    const myTotal = calculateMyTotal();
    if (myTotal <= 0) {
      alert('Selecciona al menos un item para pagar');
      return;
    }
    setShowPaymentModal(true);
  };

  const confirmPayment = async () => {
    setPaymentProcessing(true);
    const myTotal = calculateMyTotal();
    
    // Mock Stripe payment delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update local total paid
    setTotalPaid(prev => prev + myTotal);
    
    // Send WebSocket message to broadcast payment to all users
    sendPaymentConfirmation(myTotal);
    
    // TODO: Make the items have a visual cue about them being paid
    // (Or make them disappear?)
    // Clear selected items after payment
    setSelectedItems(new Set());
    
    setPaymentProcessing(false);
    setShowPaymentModal(false);
    
    alert('¡Pago confirmado! Gracias por tu pago.');
  };

  const handleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSelection = new Set(prev);
      const isCurrentlySelected = newSelection.has(itemId);
      const willBeSelected = !isCurrentlySelected;
      
      if (isCurrentlySelected) {
        newSelection.delete(itemId);
      } else {
        newSelection.add(itemId);
      }
      
      // Send WebSocket message to notify other users
      sendItemSelection(itemId, willBeSelected);
      
      return newSelection;
    });
  };

  return (
    <div className="container">
      <div className="card">
        {/* <h2>🍽️ Tu Cuenta - Las Gaoneras</h2> */}
        {/* <p><strong>QR ID:</strong> {orderId}</p> */}
        {/* {qrSession?.table_number && (
          <p><strong>Mesa:</strong> {qrSession.table_number}</p>
        )} */}
        
        {/* Collaborative Users Component - shows all connected users */}
        {orderId && (
          <CollaborativeUsers 
            qrSessionId={orderId} 
            isConnected={isConnected}
            connectedUsers={connectedUsers}
          />
        )}
        
        {/* WebSocket connection error */}
        {connectionError && (
          <div style={{
            padding: '12px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '6px',
            color: '#721c24',
            fontSize: '14px',
            marginBottom: '15px'
          }}>
            ⚠️ Error de conexión: {connectionError}
          </div>
        )}
        
        {/* Real-time status indicator */}
        {/* <div style={{ 
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
        </div> */}
        
        {qrSession && !qrSession.has_order && (
          <div style={{ 
            marginTop: '20px', 
            padding: '20px', 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeeba',
            borderRadius: '8px',
            textAlign: 'center' as const
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
            {/* <div style={{ 
              borderBottom: '2px solid #e9ecef', 
              paddingBottom: '15px',
              marginBottom: '20px'
            }}>
              <h3>📋 Detalles del Pedido</h3>
            </div> */}
            
            <OrderItemsList
              items={qrSession.order.items}
              selectedItems={selectedItems}
              itemSelections={itemSelections}
              connectedUsers={connectedUsers}
              onItemSelection={handleItemSelection}
              formatPrice={formatPrice}
            />
            
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
                color: '#2c3e50',
                marginBottom: '15px'
              }}>
                <span>Total de la cuenta:</span>
                <span>{formatPrice(qrSession.order.total)}</span>
              </div>
              
            </div>
            
            {/* <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <p style={{ margin: '0', color: '#6c757d', fontSize: '14px' }}>
                  💡 Toca en los items para seleccionar lo que ordenaste. Los items bloqueados (🔒) fueron seleccionados por otros usuarios. En las próximas iteraciones podrás pagar tu parte
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
            </div> */}
          </div>
        )}
        
        {/* Mock Stripe Payment Modal */}
        {showPaymentModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#2c3e50' }}>💳 Pago con Stripe</h3>
                <p style={{ margin: '0', color: '#6c757d', fontSize: '14px' }}>
                  Pago simulado - No se procesará dinero real
                </p>
              </div>
              
              <div style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '16px' }}>Total a pagar:</span>
                  <span style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold',
                    color: '#007bff'
                  }}>
                    {formatPrice(calculateMyTotal())}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                  {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} seleccionado{selectedItems.size !== 1 ? 's' : ''}
                </div>
              </div>
              
              {/* Mock Credit Card Form */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  fontSize: '14px',
                  color: '#6c757d'
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    💳 **** **** **** 4242 (Mock Stripe Card)
                  </div>
                  <div>
                    🔒 Pago seguro simulado
                  </div>
                </div>
              </div>
              
              {/* Show Payment Modal */}
              <div style={{
                display: 'flex',
                gap: '12px'
              }}>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={paymentProcessing}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    cursor: paymentProcessing ? 'not-allowed' : 'pointer',
                    opacity: paymentProcessing ? 0.6 : 1
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmPayment}
                  disabled={paymentProcessing}
                  style={{
                    flex: 2,
                    padding: '12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: paymentProcessing ? 'not-allowed' : 'pointer',
                    opacity: paymentProcessing ? 0.6 : 1
                  }}
                >
                  {paymentProcessing ? '⏳ Procesando...' : '✅ Confirmar Pago'}
                </button>
              </div>

            </div>
          </div>
        )}

        <ModalSheet  
          myTotal={calculateMyTotal()}
          totalPaidByGroup={totalPaidByGroup}
          totalPaid={totalPaid}
          remainingBalance={calculateRemainingBalance()}
          paymentProcessing={paymentProcessing}
          formatPrice={formatPrice}
          onPayment={handlePayment}
        />
      </div>
    </div>
  );
};

export default Sentry.withProfiler(CheckView);
