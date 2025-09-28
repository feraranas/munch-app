import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import Logo from './Logo';

interface MenuItem {
  id: string;
  name: string;
  price: number;
}

interface MenuResponse {
  items: MenuItem[];
}

interface SelectedItem {
  id: string; // This will be unique for each item instance
  menuId: string; // Original menu item ID
  name: string;
  price: number;
  qty: number; // Always 1
}

const WaitstaffMenu: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [qrId, setQrId] = useState<string>(searchParams.get('qrId') || '');
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [orderCreated, setOrderCreated] = useState<boolean>(false);
  const [createdOrderId, setCreatedOrderId] = useState<string>('');
  const [existingOrder, setExistingOrder] = useState<any>(null);
  const [isModifying, setIsModifying] = useState<boolean>(false);

  const loadExistingOrder = useCallback(async () => {
    if (!qrId) return;
    
    try {
      const response = await fetch(`http://localhost:8080/api/qr/${qrId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.has_order && data.order) {
          setExistingOrder(data.order);
          setIsModifying(true);
          
          // Convert existing order items to selected items format
          const existingItems: SelectedItem[] = data.order.items.map((item: any) => ({
            id: item.id,
            menuId: item.id.split('_')[0], // Extract original menu ID from unique ID
            name: item.name,
            price: item.price,
            qty: 1 // Always 1 per item
          }));
          
          setSelectedItems(existingItems);
        }
      }
    } catch (error) {
      console.error('Error loading existing order:', error);
    }
  }, [qrId]);

  useEffect(() => {
    fetchMenuItems();
    // If we have a QR-ID from URL params, try to load existing order
    if (qrId) {
      loadExistingOrder();
    }
  }, [qrId, loadExistingOrder]);

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
      // Always create a new separate item instance
      const newItem: SelectedItem = {
        id: `${menuItem.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID for each instance
        menuId: menuItem.id, // Original menu item ID
        name: menuItem.name,
        price: menuItem.price,
        qty: 1 // Always 1
      };
      return [...prev, newItem];
    });
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  // No longer need updateQuantity since each item is separate with qty=1

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
      // Choose endpoint based on whether we're modifying or creating
      const endpoint = isModifying 
        ? 'http://localhost:8080/api/orders/update'
        : 'http://localhost:8080/api/pos/mock-order';
      
      const method = isModifying ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          qrId: qrId.trim(), 
          selectedItems: (() => {
            // Group items by menuId and count them
            const grouped = selectedItems.reduce((acc, item) => {
              const existing = acc.find(g => g.id === item.menuId);
              if (existing) {
                existing.qty += 1;
              } else {
                acc.push({ id: item.menuId, qty: 1 });
              }
              return acc;
            }, [] as { id: string; qty: number }[]);
            return grouped;
          })()
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setCreatedOrderId(data.id);
        setOrderCreated(true);
        
        // If we're modifying, update the existing order data
        if (isModifying) {
          setExistingOrder(data);
        }
        
        // Don't clear selection when modifying, so user can see the updated state
        if (!isModifying) {
          setSelectedItems([]);
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to ${isModifying ? 'update' : 'create'} order: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error ${isModifying ? 'updating' : 'creating'} order:`, error);
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
      return total + item.price; // Each item has qty=1, so just add the price
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
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <Logo width={50} height={50} />
          <h2 style={{ marginLeft: '12px', margin: '0' }}>🍽️ Sistema POS - {isModifying ? 'Modificar Orden' : 'Las Gaoneras'}</h2>
        </div>
        {isModifying && existingOrder && (
          <div style={{ 
            backgroundColor: '#e3f2fd', 
            border: '1px solid #bbdefb',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <strong>📝 Modificando orden existente</strong>
              <div style={{ fontSize: '14px', color: '#1976d2', marginTop: '5px' }}>
                Orden ID: {existingOrder.id} • Total actual: {formatPrice(existingOrder.total)}
              </div>
            </div>
            <a 
              href="/admin"
              style={{
                padding: '6px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              ← Dashboard
            </a>
          </div>
        )}
        <p>{isModifying ? 'Modifica los items de la orden existente' : 'Selecciona los items para crear una nueva orden'}</p>
        
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
                    <div style={{ minWidth: '80px', textAlign: 'right', fontWeight: '600' }}>
                      {formatPrice(item.price)}
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
            {creating ? '⏳ Guardando...' : `${isModifying ? '💾 Actualizar' : '🍽️ Crear'} Orden (${selectedItems.length} items)`}
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
            <li>Cada clic en <strong>"+ Agregar"</strong> crea una nueva línea separada del mismo item</li>
            <li><strong>Elimina items</strong> con el botón 🗑️ si el cliente cambia de opinión</li>
            <li>Revisa el total y haz clic en <strong>"Crear Orden"</strong></li>
            <li>El cliente verá la orden <strong>inmediatamente</strong> en su teléfono</li>
          </ol>
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#6c757d' }}>
            💡 <strong>Tip:</strong> Si necesitas 3 tacos, haz clic 3 veces en "Agregar" para crear 3 líneas separadas
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sentry.withProfiler(WaitstaffMenu);
