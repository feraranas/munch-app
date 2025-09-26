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
          <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-800 text-sm mb-4">
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
          <div className="mt-5 p-5 bg-yellow-100 border border-yellow-300 rounded-lg text-center">
            <h3>⏳ Esperando Orden</h3>
            <p>{qrSession.message}</p>
            <p className="text-sm text-gray-500">
              El personal del restaurante creará tu orden. La página se actualizará automáticamente cada 3 segundos.
            </p>
            <button
              onClick={() => fetchQRSession(false)}
              disabled={polling}
              className={`mt-3 py-2 px-4 bg-blue-600 text-white border-none rounded-md text-sm transition-colors duration-200 ${
                polling ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-blue-700'
              }`}
            >
              {polling ? 'Actualizando...' : '🔄 Actualizar ahora'}
            </button>
          </div>
        )}
        
        {qrSession && qrSession.has_order && qrSession.order && (
          <div className="mt-5">
            <OrderItemsList
              items={qrSession.order.items}
              selectedItems={selectedItems}
              itemSelections={itemSelections}
              connectedUsers={connectedUsers}
              onItemSelection={handleItemSelection}
              formatPrice={formatPrice}
            />
            
            <div className="border-t-2 border-gray-200 pt-4 mt-5">
              <div className="flex justify-between items-center text-lg font-bold text-gray-800 mb-4">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[1000]">
            <div className="bg-white rounded-xl p-6 max-w-md w-[90%] shadow-2xl">
              <div className="text-center mb-5">
                <h3 className="m-0 mb-2 text-gray-800">💳 Pago con Stripe</h3>
                <p className="m-0 text-gray-500 text-sm">
                  Pago simulado - No se procesará dinero real
                </p>
              </div>
              
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-base">Total a pagar:</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatPrice(calculateMyTotal())}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} seleccionado{selectedItems.size !== 1 ? 's' : ''}
                </div>
              </div>
              
              {/* Mock Credit Card Form */}
              <div className="mb-5">
                <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-sm text-gray-500">
                  <div className="mb-2">
                    💳 **** **** **** 4242 (Mock Stripe Card)
                  </div>
                  <div>
                    🔒 Pago seguro simulado
                  </div>
                </div>
              </div>
              
              {/* Show Payment Modal */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={paymentProcessing}
                  className={`flex-1 py-3 px-4 bg-gray-500 text-white border-none rounded-md text-base transition-colors duration-200 ${
                    paymentProcessing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-600'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmPayment}
                  disabled={paymentProcessing}
                  className={`flex-[2] py-3 px-4 bg-green-600 text-white border-none rounded-md text-base font-medium transition-colors duration-200 ${
                    paymentProcessing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-green-700'
                  }`}
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
