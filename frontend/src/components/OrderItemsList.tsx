import React from 'react';
import CheckMarkIcon from './CheckMarkIcon';

interface OrderItem {
  id: string;
  menuId: string;
  name: string;
  price: number;
  qty: number;
}

interface ConnectedUser {
  id: string;
  avatar: string;
}

interface OrderItemsListProps {
  items: OrderItem[];
  selectedItems: Set<string>;
  itemSelections: Map<string, string>;
  connectedUsers: ConnectedUser[];
  onItemSelection: (menuId: string) => void;
  formatPrice: (price: number) => string;
}

const OrderItemsList: React.FC<OrderItemsListProps> = React.memo(({
  items,
  selectedItems,
  itemSelections,
  connectedUsers,
  onItemSelection,
  formatPrice
}) => {
  return (
    <div className="mb-5">
      {items.map((item, index) => {
        // Validate menuId exists - this is critical for data integrity
        if (!item.menuId) {
          console.error('🚨 CRITICAL: OrderItem missing menuId - this will break selection and payment tracking:', { item, index });
          // Don't render items without menuId to prevent data corruption
          return null;
        }
        
        const isSelectedByMe = selectedItems.has(item.menuId);
        const selectedByUserId = itemSelections.get(item.menuId);
        const isSelectedByOther = selectedByUserId && !isSelectedByMe;
        
        return (
          <div 
            key={item.menuId} 
            onClick={() => !isSelectedByOther && onItemSelection(item.menuId)}
            className={`
              flex justify-between items-center py-3 my-0 transition-colors duration-200
              ${isSelectedByMe 
                ? 'border-l-4 border-green-500' 
                : isSelectedByOther 
                  ? 'bg-light-gray border-l-4 border-gray-300 opacity-70' 
                  : 'hover:bg-gray-50'
              }
              ${isSelectedByOther ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center">
              
              {/* Quantity */}
              <span className="text-gray-600 pr-4 text-sm mr-3 w-4 text-center">
              <div className="ml-2 w-5 h-5 bg-gray-200 rounded-sm flex items-center justify-center">
                {item.qty}
                </div>
              </span>
              
              {/* Item name */}
              <span className={`
                text-base px-4
                ${isSelectedByMe 
                  ? 'text-gray-900 font-medium' 
                  : isSelectedByOther 
                    ? 'text-gray-700' 
                    : 'text-gray-900'
                }
              `}>
                {item.name}
              </span>
              
            </div>

            {/* Formatted Price and Check Mark */}
            <div className="flex items-center">
              <span className={`
                text-base font-medium
                ${isSelectedByMe 
                  ? 'text-gray-900' 
                  : isSelectedByOther 
                    ? 'text-gray-700' 
                    : 'text-gray-900'
                }
              `}>
                {formatPrice(item.price * item.qty)}
              </span>
              
              {/* Selection indicator */}
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
            </div>

          </div>
        );
      })}
    </div>
  );
});

OrderItemsList.displayName = 'OrderItemsList';

export default OrderItemsList;
