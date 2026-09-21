import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { useQRSession, useMenuItems, useCreateOrder, useUpdateOrder } from '../hooks/useQueries';
import { QRSession } from '../services/api';
import { paidItemCount, tablePayState } from '../utils/tablePayState';
import OrderItemsList, { MenuItem, OrderItem, Topping } from './OrderItemsList';
import ActiveOrderItemsList from './ActiveOrderItemsList';
// import ModalSheet from './ModalSheet'; // Kept for reference, not currently used
import GenericModalSheet from './GenericModalSheet';
import Header from './Header';
import ActiveOrderIcon from './ActiveOrderIcon';

interface RouteParams {
  tableId: string;
}

interface ToppingSelectionModal {
  menuItem: MenuItem | null;
  selectedToppings: Topping[];
}

const lineTotal = (item: OrderItem) => {
  const toppingsPrice = item.toppings?.reduce((sum, t) => sum + t.price, 0) || 0;
  return (item.price + toppingsPrice) * item.qty;
};

const itemsTotal = (items: OrderItem[]) => items.reduce((sum, item) => sum + lineTotal(item), 0);

const itemsFingerprint = (items: OrderItem[]) =>
  items
    .map((item) => `${item.menuId}:${item.id}:${item.qty}`)
    .sort()
    .join('|');

const POSView: React.FC = () => {
  const { tableId } = useParams<keyof RouteParams>() as RouteParams;
  const navigate = useNavigate();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [sentItems, setSentItems] = useState<OrderItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);
  const [toppingModal, setToppingModal] = useState<ToppingSelectionModal>({
    menuItem: null,
    selectedToppings: []
  });

  // Use TanStack Query hooks for data fetching
  const { data: sessionData, isLoading: sessionLoading, error: sessionError } = useQRSession(tableId);
  const { data: menuItems = [], isLoading: menuLoading } = useMenuItems();
  const createOrderMutation = useCreateOrder();
  const updateOrderMutation = useUpdateOrder();
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmOk, setConfirmOk] = useState<string | null>(null);

  // Convert QRSessionResponse to QRSession format
  const session: QRSession | null = useMemo(() => {
    return sessionData ? {
      id: sessionData.qr_id,
      table_number: sessionData.table_number,
      has_order: sessionData.has_order,
      paid_item_ids: sessionData.paid_item_ids,
      order: sessionData.order,
      created_at: 0, // Not provided by API, using default
      updated_at: 0, // Not provided by API, using default
    } : null;
  }, [sessionData]);

  // Hydrate once from the saved order. Do not overwrite waiter edits on poll.
  useEffect(() => {
    if (hydrated || !session) {
      return;
    }
    if (session.order?.items) {
      setOrderItems(session.order.items);
      setSentItems(session.order.items);
    }
    setHydrated(true);
  }, [session, hydrated]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const getStatusColor = (session: QRSession) => {
    switch (tablePayState(session)) {
      case 'none':
        return 'bg-gray-100 text-gray-600';
      case 'paid':
        return 'bg-green-500 text-white';
      case 'partial':
        return 'bg-amber-400 text-gray-900';
      default:
        return 'bg-sky text-white';
    }
  };

  const getStatusText = (session: QRSession) => {
    const state = tablePayState(session);
    if (state === 'none') return 'Sin orden';
    if (state === 'paid') return 'Pagado';
    if (state === 'partial') {
      const paid = paidItemCount(session);
      const total = session.order?.items.length || 0;
      return `Pago parcial ${paid}/${total}`;
    }
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
    setConfirmOk(null);
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
    setConfirmOk(null);
    setOrderItems(prev => prev.filter(item => item.menuId !== orderItem.menuId));
  };

  const calculateFullOrderTotal = () => itemsTotal(orderItems);
  const sentTotal = itemsTotal(sentItems);
  const draftTotal = itemsTotal(orderItems);
  const hasPendingChanges = itemsFingerprint(orderItems) !== itemsFingerprint(sentItems);
  const extraItemCount = orderItems.length - sentItems.length;
  const alreadySent = sentItems.length > 0;

  const confirming = createOrderMutation.isPending || updateOrderMutation.isPending;

  const handleConfirmOrder = async () => {
    if (!session || orderItems.length === 0) {
      return;
    }

    setConfirmError(null);
    setConfirmOk(null);

    const payload = {
      qrId: session.id,
      selectedItems: orderItems.map((item) => ({
        id: item.id,
        menuId: item.menuId,
        qty: item.qty,
        toppings: item.toppings || [],
      })),
    };

    try {
      if (session.has_order) {
        await updateOrderMutation.mutateAsync(payload);
      } else {
        await createOrderMutation.mutateAsync(payload);
      }
      setSentItems(orderItems);
      setConfirmOk('Orden enviada a la cuenta del cliente');
      setIsOrderSheetOpen(false);
      window.setTimeout(() => setConfirmOk(null), 4000);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'No se pudo confirmar la orden');
    }
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
            actionButton={
              <button
                onClick={() => setIsOrderSheetOpen(true)}
                className="  text-white rounded-md p-2 transition-colors duration-200"
                aria-label="Ver orden activa"
              >
                <ActiveOrderIcon width={24} height={24} className="fill-black" />
              </button>
            }
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



      
      {/* Generic Modal Sheet - Active Order */}
      <GenericModalSheet
        isOpen={isOrderSheetOpen}
        onOpenChange={setIsOrderSheetOpen}
        title="Orden Activa"
      >
        <div className="space-y-4">
          {/* Total Section */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-800">Total</span>
              <span className="text-xl font-bold text-blue-600">
                {formatPrice(calculateFullOrderTotal())}
              </span>
            </div>
          </div>

          {/* Active Order Items */}
          <div className="bg-white rounded-lg shadow-sm">
            <ActiveOrderItemsList
              items={orderItems}
              formatPrice={formatPrice}
              onRemoveItem={removeOrderItem}
            />
          </div>

          {hasPendingChanges && (
            <button
              onClick={handleConfirmOrder}
              disabled={confirming || orderItems.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-3 rounded-md"
            >
              {confirming
                ? 'Enviando...'
                : alreadySent
                  ? 'Actualizar cuenta'
                  : 'Confirmar orden'}
            </button>
          )}
        </div>
      </GenericModalSheet>

      {(hasPendingChanges || confirmOk) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40">
          <div className="container mx-auto max-w-2xl">
            {confirmError && <p className="text-sm text-red-600 mb-2">{confirmError}</p>}
            {confirmOk && !hasPendingChanges && (
              <p className="text-sm text-green-700">{confirmOk} · {formatPrice(sentTotal)}</p>
            )}
            {hasPendingChanges && (
              <div className="flex items-center justify-between gap-4">
                <div>
                  {alreadySent ? (
                    <>
                      <div className="text-sm text-gray-600">
                        {extraItemCount > 0
                          ? `Vas a agregar ${extraItemCount} item${extraItemCount !== 1 ? 's' : ''}`
                          : extraItemCount < 0
                            ? `Vas a quitar ${Math.abs(extraItemCount)} item${Math.abs(extraItemCount) !== 1 ? 's' : ''}`
                            : 'Cambios pendientes'}
                      </div>
                      <div className="text-base font-medium text-gray-900">
                        La cuenta pasará de {formatPrice(sentTotal)} a {formatPrice(draftTotal)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-gray-500">
                        {orderItems.length} item{orderItems.length !== 1 ? 's' : ''}
                      </div>
                      <div className="text-lg font-semibold">{formatPrice(draftTotal)}</div>
                    </>
                  )}
                </div>
                <button
                  onClick={handleConfirmOrder}
                  disabled={confirming || orderItems.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-3 rounded-md shrink-0"
                >
                  {confirming
                    ? 'Enviando...'
                    : alreadySent
                      ? 'Actualizar cuenta'
                      : 'Confirmar orden'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Sheet - show total order value (Original - kept for reference) */}
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