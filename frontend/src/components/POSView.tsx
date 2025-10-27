import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { useQRSession, useMenuItems, useCreateOrder } from '../hooks/useQueries';
import { QRSession } from '../services/api';
import OrderItemsList, { MenuItem, OrderItem, Topping } from './OrderItemsList';
import ActiveOrderItemsList from './ActiveOrderItemsList';
import ModalSheet from './ModalSheet';
import Header from './Header';

interface RouteParams {
  tableId: string;
}

interface ToppingSelectionModal {
  menuItem: MenuItem | null;
  selectedToppings: Topping[];
}

const POSView: React.FC = () => {
  const { tableId } = useParams<keyof RouteParams>() as RouteParams;
  const navigate = useNavigate();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [toppingModal, setToppingModal] = useState<ToppingSelectionModal>({
    menuItem: null,
    selectedToppings: []
  });

  // Use TanStack Query hooks for data fetching
  const { data: sessionData, isLoading: sessionLoading, error: sessionError } = useQRSession(tableId);
  const { data: menuItems = [], isLoading: menuLoading } = useMenuItems();
  const createOrderMutation = useCreateOrder();

  // Convert QRSessionResponse to QRSession format
  const session: QRSession | null = useMemo(() => {
    return sessionData ? {
      id: sessionData.qr_id,
      table_number: sessionData.table_number,
      has_order: sessionData.has_order,
      order: sessionData.order,
      created_at: 0, // Not provided by API, using default
      updated_at: 0, // Not provided by API, using default
    } : null;
  }, [sessionData]);

  // Initialize orderItems from session data when it loads
  useEffect(() => {
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
    if (!session.has_order) return 'bg-gray-100 text-gray-600'; // Gray for no order
    if (session.order?.status === 'paid') return 'bg-green-500 text-white'; // Green for paid
    return 'bg-sky text-white'; // Blue for active order
};

  const getStatusText = (session: QRSession) => {
    if (!session.has_order) return 'Sin orden';
    if (session.order?.status === 'paid') return 'Pagado';
    return 'Orden activa';
  };

  const addMenuItem = (menuItem: MenuItem) => {
    // If item has toppings, open the topping selection modal
    if (menuItem.toppings && menuItem.toppings.length > 0) {
      setToppingModal({
        menuItem,
        selectedToppings: []
      });
    } else {
      // If no toppings, add directly to order
      addMenuItemWithToppings(menuItem, []);
    }
  };

  const addMenuItemWithToppings = (menuItem: MenuItem, toppings: Topping[]) => {
    // Always add as a new item (don't increase quantity)
    const newOrderItem: OrderItem = {
      id: menuItem.id,
      menuId: `${menuItem.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: menuItem.name,
      price: menuItem.price,
      qty: 1,
      toppings: toppings.length > 0 ? toppings : undefined
    };
    setOrderItems(prev => [...prev, newOrderItem]);
  };

  const removeMenuItem = (menuItem: MenuItem) => {
    setOrderItems(prev => {
      // Find the item in cart
      const existingItemIndex = prev.findIndex(item => item.id === menuItem.id);
      
      if (existingItemIndex !== -1) {
        const updatedItems = [...prev];
        const currentQty = updatedItems[existingItemIndex].qty;
        
        if (currentQty > 1) {
          // Decrease quantity if more than 1
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            qty: currentQty - 1
          };
          return updatedItems;
        } else {
          // Remove item from cart if quantity is 1
          return updatedItems.filter((_, index) => index !== existingItemIndex);
        }
      }
      
      return prev;
    });
  };

  // Remove a specific order item from the active order
  const removeOrderItem = (orderItem: OrderItem) => {
    setOrderItems(prev => prev.filter(item => item.menuId !== orderItem.menuId));
  };

  const calculateFullOrderTotal = () => {
    return orderItems.reduce((total, item) => {
      const toppingsPrice = item.toppings?.reduce((sum, t) => sum + t.price, 0) || 0;
      return total + ((item.price + toppingsPrice) * item.qty);
    }, 0);
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
          qty: item.qty,
          toppings: item.toppings || []
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
      <div className="flex-shrink-0">

          <Header 
            title={session.table_number || `Mesa ${session.id.slice(0, 8)}`}
            onBackClick={() => navigate('/admin')}
            statusBadge={{
              text: getStatusText(session),
              colorClass: getStatusColor(session),
              size: 'sm'
            }}
            showUserInfo={false}
            showLogo={true}
          />
          
          {/* Menu Title - Overlapping below status badge */}
          <div className="flex justify-center -mt-8">
            <h2 className="text-lg font-semibold text-gray-800 m-0">
              Menú
            </h2>
          </div>

      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4">
          <div className="pb-40">

            {/* Available Menu Items */}
            <div>
              <OrderItemsList
                items={menuItems}
                formatPrice={formatPrice}
                mode="menu"
                onAddItem={addMenuItem}
                onRemoveItem={removeMenuItem}
                addButtonText="+ Agregar"
                orderItems={orderItems}
              />
            </div>
          </div>
        </div>
      </div>


      {/* Sticky Orden Activa Header */}
      <div className="sticky top-0 bg-white   shadow-sm z-10">
        <div className=" mx-auto px-4 pt-2">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 m-0">
              Orden activa
            </h2>
            <h3 className="text-lg font-semibold text-gray-800 m-0">
              Total {formatPrice(calculateFullOrderTotal())}
            </h3>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4">
          <div className="pb-40">
            {/* Active Order Items */}
            <ActiveOrderItemsList
              items={orderItems}
              formatPrice={formatPrice}
              onRemoveItem={removeOrderItem}
            />
          </div>
        </div>
      </div>

      
      {/* Modal Sheet - show total order value */}
      {/* <ModalSheet
        myTotal={calculateFullOrderTotal()}
        selectedItemsCount={orderItems.length}
        formatPrice={formatPrice}
        buttonText="Agregar"
        orderItems={orderItems}
        onConfirmOrder={handleConfirmOrder}
      /> */}

      {/* Topping Selection Modal */}
      {toppingModal.menuItem && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setToppingModal({ menuItem: null, selectedToppings: [] })}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {toppingModal.menuItem.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">Selecciona tus complementos</p>
            </div>

            {/* Toppings List */}
            <div className="p-4">
              {toppingModal.menuItem.toppings?.map((topping, index) => {
                const isSelected = toppingModal.selectedToppings.some(t => t.name === topping.name);
                return (
                  <div 
                    key={index}
                    className={`
                      flex items-center justify-between p-3 mb-2 rounded-md cursor-pointer transition-colors duration-200
                      ${isSelected ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'}
                    `}
                    onClick={() => {
                      setToppingModal(prev => {
                        const isCurrentlySelected = prev.selectedToppings.some(t => t.name === topping.name);
                        return {
                          ...prev,
                          selectedToppings: isCurrentlySelected
                            ? prev.selectedToppings.filter(t => t.name !== topping.name)
                            : [...prev.selectedToppings, topping]
                        };
                      });
                    }}
                  >
                    <div className="flex items-center">
                      <div className={`
                        w-5 h-5 rounded border-2 mr-3 flex items-center justify-center
                        ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}
                      `}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-base text-gray-800">{topping.name}</span>
                    </div>
                    <span className="text-base font-medium text-gray-800">{formatPrice(topping.price)}</span>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-2">
              <button
                onClick={() => setToppingModal({ menuItem: null, selectedToppings: [] })}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (toppingModal.menuItem) {
                    addMenuItemWithToppings(toppingModal.menuItem, toppingModal.selectedToppings);
                    setToppingModal({ menuItem: null, selectedToppings: [] });
                  }
                }}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors duration-200"
              >
                Agregar al pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sentry.withProfiler(POSView);