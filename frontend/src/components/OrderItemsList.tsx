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
    <div style={{ marginBottom: '20px' }}>
      {items.map((item) => {
        const isSelectedByMe = selectedItems.has(item.id);
        const selectedByUserId = itemSelections.get(item.id);
        const isSelectedByOther = selectedByUserId && !isSelectedByMe;
        const selectedUser = connectedUsers.find(user => user.id === selectedByUserId);
        
        return (
          <div 
            key={item.id} 
            onClick={() => !isSelectedByOther && onItemSelection(item.id)}
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '16px',
              margin: '8px 0',
              border: `2px solid ${
                isSelectedByMe ? '#007bff' : 
                isSelectedByOther ? '#dc3545' : 
                '#e9ecef'
              }`,
              borderRadius: '8px',
              backgroundColor: 
                isSelectedByMe ? '#f0f8ff' : 
                isSelectedByOther ? '#fdf2f2' : 
                '#ffffff',
              cursor: isSelectedByOther ? 'not-allowed' : 'pointer',
              opacity: isSelectedByOther ? 0.7 : 1,
              transition: 'all 0.2s ease',
              boxShadow: 
                isSelectedByMe ? '0 2px 8px rgba(0, 123, 255, 0.2)' : 
                isSelectedByOther ? '0 2px 8px rgba(220, 53, 69, 0.2)' : 
                '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontWeight: '500', 
                marginBottom: '4px',
                color: 
                  isSelectedByMe ? '#0056b3' : 
                  isSelectedByOther ? '#721c24' : 
                  '#212529'
              }}>
                {isSelectedByMe && '✓ '}
                {isSelectedByOther && '🔒 '}
                {item.name}
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                Cantidad: {item.qty}
                {isSelectedByOther && selectedUser && (
                  <span style={{ 
                    marginLeft: '8px', 
                    color: '#dc3545',
                    fontWeight: '500'
                  }}>
                    • Seleccionado por {selectedUser.avatar}
                  </span>
                )}
              </div>
            </div>
            <div style={{ 
              fontWeight: '600', 
              fontSize: '16px',
              color: 
                isSelectedByMe ? '#0056b3' : 
                isSelectedByOther ? '#721c24' : 
                '#212529'
            }}>
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
