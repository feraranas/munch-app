import React from 'react';

export interface Topping {
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  menuId: string;
  name: string;
  price: number;
  qty: number;
  toppings?: Topping[];
}

interface ActiveOrderItemsListProps {
  items: OrderItem[];
  formatPrice: (price: number) => string;
  onRemoveItem: (item: OrderItem) => void;
  onMarkComplete?: (item: OrderItem) => void;
}

const ActiveOrderItemsList: React.FC<ActiveOrderItemsListProps> = ({
  items,
  formatPrice,
  onRemoveItem,
  onMarkComplete
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No hay artículos en la orden
      </div>
    );
  }

  return (
    <div className="mb-2">
      {items.map((item, index) => {
        // Calculate item total including toppings
        const toppingsTotal = item.toppings?.reduce((sum, t) => sum + t.price, 0) || 0;
        const itemTotalPrice = (item.price + toppingsTotal) * item.qty;

        return (
          <React.Fragment key={`${item.id}-${index}`}>
            <div className="flex justify-between items-center py-3 my-0 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200">
              <div className="flex items-center flex-1">
                {/* Quantity Badge */}
                <span className="text-gray-600 pr-0 text-sm mr-3 w-4 text-center">
                <div className="ml-0 w-5 h-5 bg-gray-200 rounded-sm flex items-center justify-center text-xs font-medium">
                    {item.qty}
                  </div>
                </span>
                
                {/* Item name and toppings count */}
                <div className="flex-1">
                  <span className="text-base font-normal text-gray-900">
                    {item.name}
                    {item.toppings && item.toppings.length > 0 && (
                      <span className="text-sm text-gray-500 ml-1">
                        ({item.toppings.length})
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Price and Actions */}
              <div className="flex items-center gap-3">
                <span className="text-base font-semibold text-gray-900 min-w-[80px] text-right">
                  {formatPrice(itemTotalPrice)}
                </span>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {onMarkComplete && (
                    <button
                      onClick={() => onMarkComplete(item)}
                      className="w-8 h-8 bg-green-500 hover:bg-green-600 rounded-md flex items-center justify-center transition-colors duration-200"
                      title="Marcar como completado"
                    >
                      <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 16 16" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path 
                          d="M13.5 4L6 11.5L2.5 8" 
                          stroke="white" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                  
                  <button
                    onClick={() => onRemoveItem(item)}
                    className="w-5 h-5 bg-red-500 hover:bg-red-600 rounded-md flex items-center justify-center transition-colors duration-200"
                    title="Eliminar artículo"
                  >
                    <svg 
                      width="10" 
                      height="10" 
                      viewBox="0 0 16 16" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        d="M12 4L4 12M4 4L12 12" 
                        stroke="white" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Display toppings with indentation */}
            {item.toppings && item.toppings.length > 0 && (
              <div className="bg-gray-50">
                {item.toppings.map((topping, toppingIndex) => (
                  <div 
                    key={`${item.id}-topping-${toppingIndex}`}
                    className="flex justify-between items-center py-2 pl-12 pr-4 text-gray-600"
                  >
                    <span className="text-sm italic">+ {topping.name}</span>
                    <span className="text-sm font-medium">{formatPrice(topping.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ActiveOrderItemsList;

