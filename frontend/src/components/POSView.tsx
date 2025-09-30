import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { useQRSession, useMenuItems, useCreateOrder } from '../hooks/useQueries';
import { QRSession } from '../services/api';
import OrderItemsList, { MenuItem, OrderItem } from './OrderItemsList';
import ModalSheet from './ModalSheet';
import LessThanIcon from './LessThanIcon';

interface RouteParams {
  tableId: string;
}

const POSView: React.FC = () => {
  const { tableId } = useParams<keyof RouteParams>() as RouteParams;
  const navigate = useNavigate();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Use TanStack Query hooks for data fetching
  const { data: sessionData, isLoading: sessionLoading, error: sessionError } = useQRSession(tableId);
  const { data: menuItems = [], isLoading: menuLoading } = useMenuItems();
  const createOrderMutation = useCreateOrder();

  // Convert QRSessionResponse to QRSession format
  const session: QRSession | null = sessionData ? {
    id: sessionData.qr_id,
    table_number: sessionData.table_number,
    has_order: sessionData.has_order,
    order: sessionData.order,
    created_at: 0, // Not provided by API, using default
    updated_at: 0, // Not provided by API, using default
  } : null;

  // Initialize orderItems from session data when it loads
  useEffect(() => {
    if (session?.order?.items) {
      setOrderItems(session.order.items);
    }
  }, [session]);

  const handleSessionClick = (session: QRSession) => {
    navigate(`/admin/table/${session.id}/menu`);
  };

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

  const addMenuItem = (menuItem: MenuItem) => {
    setOrderItems(prev => {
      // Check if item already exists in cart
      const existingItemIndex = prev.findIndex(item => item.id === menuItem.id);
      
      if (existingItemIndex !== -1) {
        // If item exists, increase quantity
        const updatedItems = [...prev];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          qty: updatedItems[existingItemIndex].qty + 1
        };
        return updatedItems;
      } else {
        // If item doesn't exist, add new item
        const newOrderItem: OrderItem = {
          id: menuItem.id,
          menuId: `${menuItem.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: menuItem.name,
          price: menuItem.price,
          qty: 1
        };
        return [...prev, newOrderItem];
      }
    });
  };

  const calculateFullOrderTotal = () => {
    return orderItems.reduce((total, item) => total + (item.price * item.qty), 0);
  };

  const handleConfirmOrder = async () => {
    if (!session || orderItems.length === 0) {
      console.error('Cannot create order: missing session or empty cart');
      return;
    }

    createOrderMutation.mutate(
      {
        qrId: session.id,
        selectedItems: orderItems.map(item => ({
          id: item.id,
          menuId: item.menuId,
          qty: item.qty
        }))
      },
      {
        onSuccess: (data) => {
          // Clear the cart after successful order creation
          setOrderItems([]);
          
          // Show success feedback
          alert(`¡Orden creada exitosamente! ID: ${data.id}`);
        },
        onError: (error) => {
          alert(`Error al crear la orden: ${error.message || 'Error desconocido'}`);
        }
      }
    );
  };

  const isLoading = sessionLoading || menuLoading;
  const error = sessionError;

  if (isLoading) {
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
          <p className="text-gray-600 mb-4">{error instanceof Error ? error.message : 'Failed to load session'}</p>
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
              <h1 className="m-0 text-xl font-semibold text-gray-800">
                {session.table_number || `Mesa ${session.id.slice(0, 8)}`}
              </h1>
            </div>

            <div className={`px-2 py-1 rounded-sm text-white text-sm font-medium text-center ${getStatusColor(session)}`}>
              {getStatusText(session)}
            </div>

          </div>
          {getStatusText(session) === 'Orden activa' && (
            <button
              className='flex justify-end w-full px-2 py-1 rounded-sm text-black text-sm font-medium bg-gray-500'
              onClick={() => handleSessionClick(session)}
            >
              Ver orden completa
            </button>
          )}

        </div>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4">
          <div className="pb-40">

            {/* Available Menu Items */}
            <div>
              <div className="text-lg font-semibold mb-4 text-gray-800">
                Menú Disponible
              </div>
              <OrderItemsList
                items={menuItems}
                formatPrice={formatPrice}
                mode="menu"
                onAddItem={addMenuItem}
                addButtonText="+ Agregar"
                orderItems={orderItems}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal Sheet - show total order value */}
      <ModalSheet
        myTotal={calculateFullOrderTotal()}
        selectedItemsCount={orderItems.length}
        formatPrice={formatPrice}
        buttonText="Agregar"
        orderItems={orderItems}
        onConfirmOrder={handleConfirmOrder}
      />
    </div>
  );
};

export default Sentry.withProfiler(POSView);