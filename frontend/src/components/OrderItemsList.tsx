import React from 'react';
import CheckMarkIcon from './CheckMarkIcon';

export interface Topping {
  name: string;
  price: number;
}

interface BaseItem {
  id: string;
  name: string;
  price: number;
  toppings?: Topping[];
}

interface OrderItem extends BaseItem {
  menuId: string;
  qty: number;
  toppings?: Topping[];
}

interface MenuItem extends BaseItem {
  // MenuItem doesn't have menuId or qty
  toppings?: Topping[];
}

interface ConnectedUser {
  id: string;
  avatar: string;
}

interface OrderItemsListProps {
  items: OrderItem[] | MenuItem[];
  selectedItems?: Set<string>;
  itemSelections?: Map<string, string>;
  myUserId?: string | null;
  connectedUsers?: ConnectedUser[];
  onItemSelection?: (menuId: string) => void;
  formatPrice: (price: number) => string;
  // New props for menu items mode
  mode?: 'order' | 'menu';
  onAddItem?: (item: MenuItem) => void;
  onRemoveItem?: (item: MenuItem) => void;
  addButtonText?: string;
  // For tracking quantities in menu mode
  orderItems?: OrderItem[];
}

const OrderItemsList: React.FC<OrderItemsListProps> = React.memo(({
  items,
  selectedItems = new Set(),
  itemSelections = new Map(),
  myUserId = null,
  connectedUsers = [],
  onItemSelection,
  formatPrice,
  mode = 'order',
  onAddItem,
  onRemoveItem,
  addButtonText = '+ Agregar',
  orderItems = []
}) => {
  return (
    <div className="mb-5">
      {items.map((item, index) => {
        // Handle different item types based on mode
        const isOrderItem = mode === 'order' && 'menuId' in item;
        
        // For order items, validate menuId exists
        if (mode === 'order' && !('menuId' in item)) {
          console.error('🚨 CRITICAL: OrderItem missing menuId - this will break selection and payment tracking:', { item, index });
          return null;
        }
        
        // For order mode, use menuId for selection; for menu mode, use id
        const itemKey = isOrderItem ? (item as OrderItem).menuId : item.id;
        const selectedByUserId = itemSelections.get(itemKey);
        const isSelectedByMe = selectedItems.has(itemKey) || Boolean(myUserId && selectedByUserId === myUserId);
        const isSelectedByOther = Boolean(selectedByUserId && !isSelectedByMe);
        
        // Find current quantity for this menu item in cart (for menu mode)
        // Sum up all quantities for items with the same id
        const currentQuantity = mode === 'menu' 
          ? orderItems
              .filter(orderItem => orderItem.id === item.id)
              .reduce((total, orderItem) => total + orderItem.qty, 0)
          : 0;
        
        const orderItem = item as OrderItem;
        const itemTotalPrice = mode === 'order' 
          ? (orderItem.price + (orderItem.toppings?.reduce((sum, t) => sum + t.price, 0) || 0)) * orderItem.qty
          : item.price;

        return (
          <React.Fragment key={itemKey}>
            <div 
              onClick={() => {
                if (mode === 'order' && onItemSelection && !isSelectedByOther) {
                  onItemSelection(itemKey);
                }
              }}
              className={`
                flex justify-between items-center py-2 my-0 transition-colors duration-200
                ${mode === 'order' 
                  ? isSelectedByMe 
                    ? 'border-l-4 border-green-500' 
                    : isSelectedByOther 
                      ? 'bg-light-gray border-l-4 border-gray-300 opacity-70' 
                      : 'hover:bg-gray-50'
                  : 'hover:bg-gray-50'
                }
                ${mode === 'order' && isSelectedByOther ? 'cursor-not-allowed' : 'cursor-pointer'}
                ${mode === 'menu' ? 'bg-white px-1' : ''}
              `}
            >
              <div className="flex items-center">
                
                {/* Quantity - always show for menu mode (even when 0), show for order mode */}
                {(mode === 'order' || mode === 'menu') && (
                  <span className="text-gray-600 pr-0 text-sm mr-3 w-4 text-center">
                    <div className="ml-0 w-5 h-5 bg-gray-200 rounded-sm flex items-center justify-center text-xs font-medium">
                      {mode === 'order' ? (item as OrderItem).qty : currentQuantity}
                    </div>
                  </span>
                )}
                
                {/* Item name */}
                <span className={`
                  text-base font-light ${mode === 'menu' ? '' : 'px-4'}
                  ${mode === 'order' ? (
                    isSelectedByMe 
                      ? 'text-gray-900' 
                      : isSelectedByOther 
                        ? 'text-gray-700' 
                        : 'text-gray-900'
                  ) : 'text-gray-900'}
                `}>
                  {item.name}
                </span>
                
              </div>

              {/* Formatted Price and Action */}
              <div className="flex items-center">
                <span className={`
                  text-base font-medium ${mode === 'menu' ? 'mr-4' : ''}
                  ${mode === 'order' ? (
                    isSelectedByMe 
                      ? 'text-gray-900' 
                      : isSelectedByOther 
                        ? 'text-gray-700' 
                        : 'text-gray-900'
                  ) : 'text-gray-900'}
                `}>
                  {mode === 'order' 
                    ? formatPrice(itemTotalPrice)
                    : formatPrice(item.price)
                  }
                </span>
              
              {/* Selection indicator for order mode */}
              {mode === 'order' && (
                <>
                  {isSelectedByMe ? (
                    // Check Mark Circle - selected by me
                    <div className="ml-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckMarkIcon 
                        width={10} 
                        height={10} 
                        fill="#ffffff" 
                        className="flex-shrink-0"
                      />
                    </div>
                  ) : !isSelectedByOther ? (
                    // Empty Mark Circle - clickable item cue
                    <div className="ml-2 w-5 h-5 border-2 border-gray-300 rounded-full flex items-center justify-center hover:border-gray-400 transition-colors duration-200">
                    </div>
                  ) : null}
                </>
              )}
              
              {/* Add/Remove buttons for menu mode */}
              {mode === 'menu' && onAddItem && (
                <div className="flex items-center gap-2">
                  {currentQuantity > 0 ? (
                    // Show +/- controls when item is in cart
                    <div className="flex items-center gap-2 bg-gray-100 rounded-md">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onRemoveItem) {
                            onRemoveItem(item as MenuItem);
                          }
                        }}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 w-8 h-8 rounded-l-md text-lg font-semibold transition-colors duration-200 flex items-center justify-center"
                        disabled={!onRemoveItem}
                      >
                        −
                      </button>
                      <span className="text-sm text-gray-800 font-medium px-2 min-w-[2rem] text-center">
                        {currentQuantity}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddItem(item as MenuItem);
                        }}
                        className="bg-addItem hover:bg-blue-600 text-white w-8 h-8 rounded-r-md text-lg font-semibold transition-colors duration-200 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    // Show "Agregar" button when item is not in cart
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddItem(item as MenuItem);
                      }}
                      className="bg-addItem hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200"
                    >
                      {addButtonText}
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Display toppings with indentation for order mode */}
          {mode === 'order' && orderItem.toppings && orderItem.toppings.length > 0 && (
            <div className={`
              ${isSelectedByMe ? 'border-l-4 border-green-500' : isSelectedByOther ? 'border-l-4 border-gray-300' : ''}
            `}>
              {orderItem.toppings.map((topping, toppingIndex) => (
                <div 
                  key={`${itemKey}-topping-${toppingIndex}`}
                  className={`
                    flex justify-between items-center py-1 my-0 pl-16
                    ${isSelectedByMe ? 'text-gray-700' : isSelectedByOther ? 'text-gray-600' : 'text-gray-600'}
                  `}
                >
                  <span className="text-sm italic">+ {topping.name}</span>
                  <span className="text-sm">{formatPrice(topping.price)}</span>
                </div>
              ))}
            </div>
          )}
        </React.Fragment>
        );
      })}
    </div>
  );
});

OrderItemsList.displayName = 'OrderItemsList';

export default OrderItemsList;
export type { OrderItem, MenuItem };
