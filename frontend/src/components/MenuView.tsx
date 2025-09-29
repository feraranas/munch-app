import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { api } from '../config/environment';
import OrderItemsList from './OrderItemsList';
import LessThanIcon from './LessThanIcon';

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

const MenuView: React.FC = () => {
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
    if (!session.has_order) return 'bg-gray-500'; // Gray for no order
    if (session.order?.status === 'paid') return 'bg-green-500'; // Green for paid
    return 'bg-blue-500'; // Blue for active order
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
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2">Cargando detalles...</h2>
          <p className="text-gray-600">Por favor espera mientras cargamos la información de la mesa.</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors duration-200"
            onClick={() => navigate('/admin')}
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
      <div className="flex-shrink-0 bg-gray-100">
        <div className="container mx-auto px-4">
          {/* Header with table number and status */}
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/admin')}
                className="bg-transparent border-none cursor-pointer mr-3 hover:bg-gray-100 rounded transition-colors duration-200"
              >
                <LessThanIcon
                  width={15}
                  height={20}
                  fill="#000000" 
                  className="flex-shrink-0"
                />
              </button>
              <h1 className="m-0 text-2xl font-semibold text-gray-800">
                {session.table_number || `Mesa ${session.id.slice(0, 8)}`}
              </h1>
            </div>

            <div className={`px-2 py-1 rounded-sm text-white text-sm font-medium ${getStatusColor(session)}`}>
              {getStatusText(session)}
            </div>

          </div>

        </div>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4">
          <div className="pb-40">
            {/* Current Order Items */}
            {orderItems.length > 0 && (
              <div className="mb-4">
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
                
              </div>
            )}

           
          </div>
        </div>
      </div>

    </div>
  );
};

export default Sentry.withProfiler(MenuView);
