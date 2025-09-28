import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { useWebSocket } from '../hooks/useWebSocket';
import CollaborativeUsers from './UserProfile';
import OrderItemsList from './OrderItemsList';
import ModalSheet from './ModalSheet';
import { api } from '../config/environment';

interface RouteParams {
  orderId: string; // This is actually the QR-ID now
}

interface OrderItem {
  id: string;
  menuId: string;
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
      console.log('qrSessionOrder: ', sessionData)
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
      .filter((item) => {
        // Validate menuId exists - critical for payment accuracy
        if (!item.menuId) {
          console.error('🚨 CRITICAL: calculateMyTotal found OrderItem without menuId - payment calculation will be incorrect:', item);
          return false; // Exclude items without menuId from payment calculation
        }
        return selectedItems.has(item.menuId);
      })
      .reduce((total, item) => total + (item.price * item.qty), 0);
  };

  // const calculateRemainingBalance = () => {
  //   if (!qrSession?.order?.total) return 0;
  //   return qrSession.order.total - (totalPaid + totalPaidByGroup);
  // };

  // const handlePayment = () => {
  //   const myTotal = calculateMyTotal();
  //   if (myTotal <= 0) {
  //     alert('Selecciona al menos un item para pagar');
  //     return;
  //   }
  //   setShowPaymentModal(true);
  // };

  const handleCancelPayment = () => { }

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
    // setShowPaymentModal(false);

    alert('¡Pago confirmado! Gracias por tu pago.');
  };

  const handleItemSelection = (menuId: string) => {
    setSelectedItems(prev => {
      const newSelection = new Set(prev);
      const isCurrentlySelected = newSelection.has(menuId);
      const willBeSelected = !isCurrentlySelected;

      if (isCurrentlySelected) {
        newSelection.delete(menuId);
      } else {
        newSelection.add(menuId);
      }

      // Send WebSocket message to notify other users
      sendItemSelection(menuId, willBeSelected);

      return newSelection;
    });
  };

  return (
    <div className="container">
      <div className="">

        {/* Collaborative Users Component - shows all connected users */}
        {orderId && (
          <CollaborativeUsers
            qrSessionId={orderId}
            isConnected={isConnected}
            connectedUsers={connectedUsers}
          />
        )}

        {qrSession?.table_number && (
          qrSession.table_number
        )}
        {qrSession && qrSession.order && (
          <div className="flex justify-between items-center text-lg font-bold text-gray-800 mb-4">
            <span>Total de la cuenta:</span>
            <span>{formatPrice(qrSession.order.total)}</span>
          </div>
        )}

        {/* WebSocket connection error */}
        {connectionError && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-800 text-sm mb-4">
            ⚠️ Error de conexión: {connectionError}
          </div>
        )}

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
              className={`mt-3 py-2 px-4 bg-blue-600 text-white border-none rounded-md text-sm transition-colors duration-200 ${polling ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-blue-700'
                }`}
            >
              {polling ? 'Actualizando...' : '🔄 Actualizar ahora'}
            </button>
          </div>
        )}

        {qrSession && qrSession.has_order && qrSession.order && (
          <div className="mt-6">
            <OrderItemsList
              items={qrSession.order.items}
              selectedItems={selectedItems}
              itemSelections={itemSelections}
              connectedUsers={connectedUsers}
              onItemSelection={handleItemSelection}
              formatPrice={formatPrice}
            />
          </div>
        )}


        <ModalSheet
          myTotal={calculateMyTotal()}
          // totalPaidByGroup={totalPaidByGroup}
          // totalPaid={totalPaid}
          // remainingBalance={calculateRemainingBalance()}
          paymentProcessing={paymentProcessing}
          selectedItemsCount={selectedItems.size}
          formatPrice={formatPrice}
          onPayment={confirmPayment}
          onCancelPayment={handleCancelPayment}
        />
      </div>
    </div>
  );
};

export default Sentry.withProfiler(CheckView);
