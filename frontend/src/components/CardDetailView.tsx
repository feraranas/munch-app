import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { api } from '../config/environment';
import OrderItemsList from './OrderItemsList';
import ModalSheet from './ModalSheet';

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

interface QRSession {
  id: string;
  table_number?: string;
  created_at: number;
  updated_at: number;
  has_order: boolean;
  order?: Order;
}

interface RouteParams {
  tableId: string;
}

const CardDetailView: React.FC = () => {
  const { tableId } = useParams<keyof RouteParams>() as RouteParams;
  const navigate = useNavigate();
  const [session, setSession] = useState<QRSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false);

  const fetchSessionData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(api.adminSessions());
      
      if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.statusText}`);
      }
      
      const data = await response.json();
      const foundSession = data.sessions.find((s: QRSession) => s.id === tableId);
      
      if (!foundSession) {
        throw new Error('Session not found');
      }
      
      setSession(foundSession);
      setError(null);
    } catch (err) {
      console.error('Error fetching session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const getStatusColor = (session: QRSession) => {
    if (!session.has_order) return '#6c757d'; // Gray for no order
    if (session.order?.status === 'paid') return '#28a745'; // Green for paid
    return '#007bff'; // Blue for active order
  };

  const getStatusText = (session: QRSession) => {
    if (!session.has_order) return 'Sin orden';
    if (session.order?.status === 'paid') return 'Pagado';
    return 'Orden activa';
  };

  const handleItemSelection = (menuId: string) => {
    setSelectedItems(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(menuId)) {
        newSelection.delete(menuId);
      } else {
        newSelection.add(menuId);
      }
      return newSelection;
    });
  };

  const calculateMyTotal = () => {
    if (!session?.order?.items) return 0;

    return session.order.items
      .filter((item) => {
        if (!item.menuId) {
          console.error('🚨 CRITICAL: calculateMyTotal found OrderItem without menuId:', item);
          return false;
        }
        return selectedItems.has(item.menuId);
      })
      .reduce((total, item) => total + (item.price * item.qty), 0);
  };

  const handlePayment = async () => {
    setPaymentProcessing(true);
    // Mock payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPaymentProcessing(false);
    alert('¡Pago confirmado!');
    setSelectedItems(new Set());
  };

  const handleCancelPayment = () => {
    // Handle cancel payment logic
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <h2>Cargando detalles...</h2>
          <p>Por favor espera mientras cargamos la información de la mesa.</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="container">
        <div className="card">
          <h2>Error</h2>
          <p>{error}</p>
          <button 
            className="btn" 
            onClick={() => navigate('/admin')}
            style={{ marginTop: '10px' }}
          >
            ← Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="container">
          {/* Header with table number and status */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '20px 0',
            borderBottom: '1px solid #e9ecef',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button 
                onClick={() => navigate('/admin')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  marginRight: '10px',
                  padding: '5px'
                }}
              >
                ←
              </button>
              <h1 style={{ margin: '0', fontSize: '24px', fontWeight: '600' }}>
                {session.table_number || `Mesa ${session.id.slice(0, 8)}`}
              </h1>
            </div>
            <div style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: getStatusColor(session),
              color: 'white',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {getStatusText(session)}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="container">
          {session.has_order && session.order ? (
            <div className="pb-40">
              {/* Menu Label */}
              <div style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                marginBottom: '15px',
                color: '#333'
              }}>
                Menú
              </div>
              
              {/* Order Items List */}
              <OrderItemsList
                items={session.order.items}
                selectedItems={selectedItems}
                itemSelections={new Map()} // Empty map for admin view
                connectedUsers={[]} // Empty array for admin view
                onItemSelection={handleItemSelection}
                formatPrice={formatPrice}
              />
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: '#6c757d',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <h3>No hay orden activa</h3>
              <p>Esta mesa aún no tiene una orden creada.</p>
              <a 
                href={`/admin/pos?qrId=${session.id}`}
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  marginTop: '10px'
                }}
              >
                ➕ Crear Orden
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Modal Sheet - only show if there's an order and items selected */}
      {session.has_order && session.order && selectedItems.size > 0 && (
        <ModalSheet
          myTotal={calculateMyTotal()}
          paymentProcessing={paymentProcessing}
          selectedItemsCount={selectedItems.size}
          formatPrice={formatPrice}
          onPayment={handlePayment}
          onCancelPayment={handleCancelPayment}
          buttonText="Crear Orden"
        />
      )}
    </div>
  );
};

export default Sentry.withProfiler(CardDetailView);
