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

interface MenuItem {
  id: string;
  name: string;
  price: number;
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
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // TODO: Seems redundant to fetch all QR sessions since the parent element 
  // AdminDashboard.tsx did this for us. So this component could be seeded
  // the QRSession. Or, create a new endpoint that gets QRSession by ID.
  // or even better use the existing getOrderByQR /qr/:qrId endpoint.
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

  const fetchMenuItems = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8080/api/menu/items');
      if (response.ok) {
        const data = await response.json();
        setMenuItems(data.items);
      } else {
        console.error('Failed to fetch menu items');
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  }, []);

  useEffect(() => {
    fetchSessionData();
    fetchMenuItems();
  }, [fetchSessionData, fetchMenuItems]);

  useEffect(() => {
    // Initialize orderItems from session data
    if (session?.order?.items) {
      setOrderItems(session.order.items);
    }
  }, [session]);

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

  const addMenuItem = (menuItem: MenuItem) => {
    const newOrderItem: OrderItem = {
      id: menuItem.id,
      menuId: `${menuItem.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: menuItem.name,
      price: menuItem.price,
      qty: 1
    };
    setOrderItems(prev => [...prev, newOrderItem]);
  };

  const removeOrderItem = (menuId: string) => {
    setOrderItems(prev => prev.filter(item => item.menuId !== menuId));
    setSelectedItems(prev => {
      const newSelection = new Set(prev);
      newSelection.delete(menuId);
      return newSelection;
    });
  };


  const calculateFullOrderTotal = () => {
    return orderItems.reduce((total, item) => total + (item.price * item.qty), 0);
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

            {/* Menu Label */}
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '15px',
              color: '#333'
            }}>
              Menú
            </div>

          </div>
        </div>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="container">
          <div className="pb-40">
            {/* Current Order Items */}
            {orderItems.length > 0 && (
              <div className="mb-8">
                <div className="text-lg font-semibold mb-4 text-gray-800">
                  Orden Actual ({orderItems.length} items)
                </div>
                <OrderItemsList
                  items={orderItems}
                  selectedItems={selectedItems}
                  itemSelections={new Map()} // Empty map for admin view
                  connectedUsers={[]} // Empty array for admin view
                  onItemSelection={handleItemSelection}
                  formatPrice={formatPrice}
                />
                
                {/* Remove Selected Items Button */}
                {selectedItems.size > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        selectedItems.forEach(menuId => removeOrderItem(menuId));
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors duration-200"
                    >
                      🗑️ Eliminar Seleccionados ({selectedItems.size})
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Available Menu Items */}
            <div>
              <div className="text-lg font-semibold mb-4 text-gray-800">
                Menú Disponible
              </div>
              <div className="space-y-2">
                {menuItems.map((menuItem) => (
                  <div
                    key={menuItem.id}
                    className="flex justify-between items-center py-3 px-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex items-center">
                      <span className="text-base text-gray-900 px-4">
                        {menuItem.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center">
                      <span className="text-base font-medium text-gray-900 mr-4">
                        {formatPrice(menuItem.price)}
                      </span>
                      <button
                        onClick={() => addMenuItem(menuItem)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200"
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Sheet - show total order value */}
      <ModalSheet
        myTotal={calculateFullOrderTotal()}
        selectedItemsCount={orderItems.length}
        formatPrice={formatPrice}
        buttonText="Actualizar Orden"
      />
    </div>
  );
};

export default Sentry.withProfiler(CardDetailView);
