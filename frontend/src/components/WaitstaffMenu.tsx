import React, { useState, useEffect } from 'react';
import * as Sentry from '@sentry/react';

interface MenuItem {
  id: string;
  name: string;
  price: number;
}

interface MenuResponse {
  items: MenuItem[];
}

const WaitstaffMenu: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [orderCreated, setOrderCreated] = useState<boolean>(false);
  const [createdOrderId, setCreatedOrderId] = useState<string>('');

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/menu/items');
      if (response.ok) {
        const data: MenuResponse = await response.json();
        setMenuItems(data.items);
      } else {
        console.error('Failed to fetch menu items');
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const createOrder = async () => {
    setCreating(true);
    try {
      const response = await fetch('http://localhost:8080/api/pos/mock-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selectedItems }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setCreatedOrderId(data.id);
        setOrderCreated(true);
        setSelectedItems([]); // Clear selection after creating order
      } else {
        alert('Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error connecting to backend. Make sure the Go server is running on port 8080.');
    } finally {
      setCreating(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, itemId) => {
      const item = menuItems.find(item => item.id === itemId);
      return total + (item ? item.price : 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <h2>Cargando menú...</h2>
          <p>Por favor espera mientras cargamos los items del menú.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h2>🍽️ Sistema POS - Las Gaoneras</h2>
        <p>Selecciona los items para crear una nueva orden</p>
        
        {orderCreated && (
          <div style={{ 
            marginBottom: '20px', 
            padding: '15px', 
            backgroundColor: '#d4edda', 
            border: '1px solid #c3e6cb',
            borderRadius: '4px',
            color: '#155724'
          }}>
            ✅ ¡Orden creada exitosamente!<br />
            <strong>ID de Orden:</strong> {createdOrderId}<br />
            <a href={`/check/${createdOrderId}`} style={{ color: '#155724', textDecoration: 'underline' }}>
              Ver recibo del cliente
            </a>
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <h3>📋 Menú Disponible</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
            gap: '12px',
            marginTop: '15px'
          }}>
            {menuItems.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleItemSelection(item.id)}
                style={{
                  border: '2px solid',
                  borderColor: selectedItems.includes(item.id) ? '#007bff' : '#e9ecef',
                  borderRadius: '8px',
                  padding: '15px',
                  cursor: 'pointer',
                  backgroundColor: selectedItems.includes(item.id) ? '#f8f9ff' : 'white',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>
                    {formatPrice(item.price)}
                  </div>
                </div>
                <div style={{ 
                  fontSize: '20px',
                  color: selectedItems.includes(item.id) ? '#007bff' : '#e9ecef'
                }}>
                  {selectedItems.includes(item.id) ? '✓' : '○'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedItems.length > 0 && (
          <div style={{ 
            borderTop: '2px solid #e9ecef', 
            paddingTop: '20px',
            marginTop: '20px'
          }}>
            <h3>🛒 Resumen del Pedido</h3>
            <div style={{ marginBottom: '15px' }}>
              {selectedItems.map(itemId => {
                const item = menuItems.find(item => item.id === itemId);
                return item ? (
                  <div key={itemId} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: '8px 0',
                    borderBottom: '1px solid #f8f9fa'
                  }}>
                    <span>{item.name}</span>
                    <span>{formatPrice(item.price)}</span>
                  </div>
                ) : null;
              })}
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '20px'
            }}>
              <span>Total:</span>
              <span>{formatPrice(calculateTotal())}</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            className="btn" 
            onClick={createOrder}
            disabled={creating || selectedItems.length === 0}
            style={{ 
              backgroundColor: '#28a745', 
              borderColor: '#28a745',
              flex: '1',
              minWidth: '200px'
            }}
          >
            {creating ? 'Creando Orden...' : `🍽️ Crear Orden (${selectedItems.length} items)`}
          </button>
          
          <button 
            className="btn" 
            onClick={() => setSelectedItems([])}
            disabled={selectedItems.length === 0}
            style={{ 
              backgroundColor: '#6c757d', 
              borderColor: '#6c757d',
              minWidth: '120px'
            }}
          >
            🗑️ Limpiar
          </button>
        </div>

        <div style={{ 
          marginTop: '30px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px' 
        }}>
          <h4>📋 Instrucciones para el Personal:</h4>
          <ol>
            <li>Selecciona los items que el cliente ha pedido</li>
            <li>Revisa el resumen del pedido y el total</li>
            <li>Haz clic en "Crear Orden" para generar la orden</li>
            <li>El sistema generará un ID único para la orden</li>
            <li>Puedes compartir el enlace del recibo con el cliente</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Sentry.withProfiler(WaitstaffMenu);
