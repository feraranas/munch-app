import React from 'react';
import CheckMarkIcon from './CheckMarkIcon';

interface BaseItem {
  id: string;
  name: string;
  price: number;
}

interface OrderItem extends BaseItem {
  menuId: string;
  qty: number;
}

interface MenuItem extends BaseItem {
  // MenuItem doesn't have menuId or qty
}

interface ConnectedUser {
  id: string;
  avatar: string;
}

interface OrderItemsListProps {
  items: OrderItem[] | MenuItem[];
  selectedItems?: Set<string>;
  itemSelections?: Map<string, string>;
  connectedUsers?: ConnectedUser[];
  onItemSelection?: (menuId: string) => void;
  formatPrice: (price: number) => string;
  // New props for menu items mode
  mode?: 'order' | 'menu';
  onAddItem?: (item: MenuItem) => void;
  addButtonText?: string;
}

const OrderItemsList: React.FC<OrderItemsListProps> = React.memo(({
  items,
  selectedItems = new Set(),
  itemSelections = new Map(),
  connectedUsers = [],
  onItemSelection,
  formatPrice,
  mode = 'order',
  onAddItem,
  addButtonText = '+ Agregar'
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
        const isSelectedByMe = selectedItems.has(itemKey);
        const selectedByUserId = itemSelections.get(itemKey);
        const isSelectedByOther = selectedByUserId && !isSelectedByMe;
        
        return (
          <div 
            key={itemKey}
            onClick={() => {
              if (mode === 'order' && onItemSelection && !isSelectedByOther) {
                onItemSelection(itemKey);
              }
            }}
            className={`
              flex justify-between items-center py-3 my-0 transition-colors duration-200
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
              
              {/* Quantity - only show for order items */}
              {mode === 'order' && (
                <span className="text-gray-600 pr-4 text-sm mr-3 w-4 text-center">
                  <div className="ml-2 w-5 h-5 bg-gray-200 rounded-sm flex items-center justify-center">
                    {(item as OrderItem).qty}
                  </div>
                </span>
              )}
              
              {/* Item name */}
              <span className={`
                text-base ${mode === 'menu' ? '' : 'px-4'}
                ${mode === 'order' ? (
                  isSelectedByMe 
                    ? 'text-gray-900 font-medium' 
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
                  ? formatPrice(item.price * (item as OrderItem).qty)
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
              
              {/* Add button for menu mode */}
              {mode === 'menu' && onAddItem && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddItem(item as MenuItem);
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200"
                >
                  {addButtonText}
                </button>
              )}
            </div>

          </div>
        );
      })}
    </div>
  );
});

OrderItemsList.displayName = 'OrderItemsList';

export default OrderItemsList;
export type { OrderItem, MenuItem };
