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
        const selectedUser = connectedUsers.find(user => user.id === selectedByUserId);
        
        return (
          <div 
            key={item.id} 
            onClick={() => !isSelectedByOther && onItemSelection(item.id)}
            className={`
              flex justify-between items-center p-4 my-2 border-2 rounded-lg transition-all duration-200
              ${isSelectedByMe 
                ? 'border-blue-600 bg-blue-50 shadow-blue-200 shadow-md' 
                : isSelectedByOther 
                  ? 'border-red-500 bg-red-50 shadow-red-200 shadow-md opacity-70' 
                  : 'border-gray-200 bg-white shadow-sm'
              }
              ${isSelectedByOther ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
            `}
          >
            <div className="flex-1">
              <div className={`
                font-medium mb-1
                ${isSelectedByMe 
                  ? 'text-blue-700' 
                  : isSelectedByOther 
                    ? 'text-red-800' 
                    : 'text-gray-900'
                }
              `}>
                {isSelectedByMe && '✓ '}
                {isSelectedByOther && '🔒 '}
                {item.name}
              </div>
              <div className="text-sm text-gray-500">
                Cantidad: {item.qty}
                {isSelectedByOther && selectedUser && (
                  <span className="ml-2 text-red-500 font-medium">
                    • Seleccionado por {selectedUser.avatar}
                  </span>
                )}
              </div>
            </div>
            <div className={`
              font-semibold text-base
              ${isSelectedByMe 
                ? 'text-blue-700' 
                : isSelectedByOther 
                  ? 'text-red-800' 
                  : 'text-gray-900'
              }
            `}>
              {formatPrice(item.price * item.qty)}
            </div>
          </div>
        );
      })}
    </div>
  );
});

OrderItemsList.displayName = 'OrderItemsList';

export default OrderItemsList;
