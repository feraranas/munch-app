import React, { useState, useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { api } from '../config/environment';
import Header from './Header';

interface Topping {
  name: string;
  price: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  toppings?: Topping[];
}

const ClientMenuView: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        const response = await fetch(api.menuItems());
        
        if (!response.ok) {
          throw new Error(`Failed to fetch menu items: ${response.statusText}`);
        }
        
        const data = await response.json();
        setMenuItems(data.items || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching menu items:', err);
        setError(err instanceof Error ? err.message : 'Failed to load menu');
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2">Cargando menú...</h2>
          <p className="text-gray-600">Por favor espera mientras cargamos el menú.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Usa la navegación inferior para continuar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Fixed Header Section - No back button */}
      <div className="flex-shrink-0">
        <Header 
          title="Menú"
          showUserInfo={false}
          showLogo={true}
        />
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="container mx-auto px-4 pt-2">
          {menuItems.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No hay items en el menú
            </div>
          ) : (
            <div className="space-y-0">
              {menuItems.map((item) => (
                <div key={item.id}>
                  {/* Menu Item Row */}
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 bg-white">
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-gray-900">
                        {item.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold text-gray-900">
                        {formatPrice(item.price)}
                      </span>
                    </div>
                  </div>

                  {/* Toppings Display (read-only) */}
                  {item.toppings && item.toppings.length > 0 && (
                    <div className="bg-gray-50 border-b border-gray-100">
                      <div className="pl-8 pr-4 py-1">
                        {item.toppings.map((topping, index) => (
                          <div 
                            key={`${item.id}-topping-${index}`}
                            className="flex justify-between items-center py-1 text-gray-600"
                          >
                            <span className="text-sm italic">+ {topping.name}</span>
                            <span className="text-sm font-medium">{formatPrice(topping.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sentry.withProfiler(ClientMenuView);

