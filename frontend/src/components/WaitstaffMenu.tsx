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

interface SelectedItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

const WaitstaffMenu: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [qrId, setQrId] = useState<string>('');
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

  const addItem = (menuItem: MenuItem) => {
    setSelectedItems(prev => {
      const existingIndex = prev.findIndex(item => item.id === menuItem.id);
      if (existingIndex >= 0) {
        // Increment quantity if item already exists
        const updated = [...prev];
        updated[existingIndex].qty += 1;
        return updated;
      } else {
        // Add new item with quantity 1
        return [...prev, {
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          qty: 1
        }];
      }
    });
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(itemId);
      return;
    }
    
    setSelectedItems(prev => {
      const updated = [...prev];
      const index = updated.findIndex(item => item.id === itemId);
      if (index >= 0) {
        updated[index].qty = newQty;
      }
      return updated;
    });
  };

  const createOrder = async () => {
    if (!qrId.trim()) {
      alert('Por favor ingresa un QR-ID válido');
      return;
    }
    
    if (selectedItems.length === 0) {
      alert('Por favor selecciona al menos un item del menú');
      return;
    }
    
    setCreating(true);
    try {
      const response = await fetch('http://localhost:8080/api/pos/mock-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          qrId: qrId.trim(), 
          selectedItems: selectedItems.map(item => ({
            id: item.id,
            qty: item.qty
          }))
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setCreatedOrderId(data.id);
        setOrderCreated(true);
        setSelectedItems([]); // Clear selection after creating order
      } else {
        const errorData = await response.json();
        alert(`Failed to create order: ${errorData.error || 'Unknown error'}`);
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
    return selectedItems.reduce((total, item) => {
      return total + (item.price * item.qty);
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
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            QR-ID de la Mesa:
          </label>
          <input
            type="text"
            value={qrId}
            onChange={(e) => setQrId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e9ecef',
              borderRadius: '8px',
              fontSize: '16px',
              fontFamily: 'monospace'
            }}
            placeholder="Ingresa el QR-ID de la mesa (ej: a1b2c3d4-...)"
          />
          <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
            💡 Obtén el QR-ID desde el sistema de generación de QR
          </p>
        </div>

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
            <strong>QR-ID:</strong> {qrId}<br />
            <a href={`/check/${qrId}`} style={{ color: '#155724', textDecoration: 'underline' }}>
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
                style={{
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: 'white',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>
                      {formatPrice(item.price)}
                    </div>
                  </div>
                  <button
                    onClick={() => addItem(item)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    + Agregar
                  </button>
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
              {selectedItems.map(item => (
                <div key={item.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid #f8f9fa'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>
                      {formatPrice(item.price)} c/u
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => updateQuantity(item.id, item.qty - 1)}
                        style={{
                          width: '30px',
                          height: '30px',
                          border: '1px solid #ddd',
                          backgroundColor: 'white',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px'
                        }}
                      >
                        −
                      </button>
                      
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                        style={{
                          width: '50px',
                          textAlign: 'center',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          padding: '4px',
                          fontSize: '14px'
                        }}
                        min="1"
                      />
                      
                      <button
                        onClick={() => updateQuantity(item.id, item.qty + 1)}
                        style={{
                          width: '30px',
                          height: '30px',
                          border: '1px solid #ddd',
                          backgroundColor: 'white',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px'
                        }}
                      >
                        +
                      </button>
                    </div>
                    
                    <div style={{ minWidth: '80px', textAlign: 'right', fontWeight: '600' }}>
                      {formatPrice(item.price * item.qty)}
                    </div>
                    
                    <button
                      onClick={() => removeItem(item.id)}
                      style={{
                        padding: '6px 8px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      title="Eliminar item"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '20px',
              paddingTop: '15px',
              borderTop: '2px solid #e9ecef'
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
            disabled={creating || selectedItems.length === 0 || !qrId.trim()}
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
            <li>Ingresa el <strong>QR-ID</strong> de la mesa del cliente</li>
            <li>Usa <strong>"+ Agregar"</strong> para añadir items al pedido</li>
            <li>Ajusta <strong>cantidades</strong> con los botones +/- o ingresa el número directamente</li>
            <li><strong>Elimina items</strong> con el botón 🗑️ si el cliente cambia de opinión</li>
            <li>Revisa el total y haz clic en <strong>"Crear Orden"</strong></li>
            <li>El cliente verá la orden <strong>inmediatamente</strong> en su teléfono</li>
          </ol>
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#6c757d' }}>
            💡 <strong>Tip:</strong> Puedes modificar la orden hasta hacer clic en "Crear Orden"
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sentry.withProfiler(WaitstaffMenu);
