import React from 'react';

interface OrderItem {
  id: string;
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
  onItemSelection: (itemId: string) => void;
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
      {items.map((item) => {
        const isSelectedByMe = selectedItems.has(item.id);
        const selectedByUserId = itemSelections.get(item.id);
        const isSelectedByOther = selectedByUserId && !isSelectedByMe;
        
        return (
          <div 
            key={item.id} 
            onClick={() => !isSelectedByOther && onItemSelection(item.id)}
            className={`
              flex justify-between items-center py-3 px-4 my-1 transition-colors duration-200
              ${isSelectedByMe 
                ? 'bg-green-50 border-l-4 border-green-500' 
                : isSelectedByOther 
                  ? 'bg-red-50 border-l-4 border-red-400 opacity-70' 
                  : 'hover:bg-gray-50'
              }
              ${isSelectedByOther ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center">
              <span className="text-gray-600 text-sm mr-3 w-4 text-center">
                {item.qty}
              </span>
              <span className={`
                text-base
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
          </div>
        );
      })}
    </div>
  );
});

OrderItemsList.displayName = 'OrderItemsList';

export default OrderItemsList;
