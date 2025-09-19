import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import * as Sentry from '@sentry/react';

interface RouteParams {
  orderId: string;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: number;
}

const CheckView: React.FC = () => {
  const { orderId } = useParams<keyof RouteParams>() as RouteParams;
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8080/api/orders/${orderId}`);
        
        if (!response.ok) {
          throw new Error(`Order not found: ${response.statusText}`);
        }
        
        const orderData = await response.json();
        setOrder(orderData);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError(err instanceof Error ? err.message : 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <h2>Cargando tu cuenta...</h2>
          <p>Porfavor espera mientras preparamos los detalles de tu cuenta.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <h2>Error, llama al mesero</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  return (
    <div className="container">
      <div className="card">
        <h2>🍽️ Tu Cuenta - Las Gaoneras</h2>
        <p><strong>Orden:</strong> {orderId}</p>
        
        {order && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ 
              borderBottom: '2px solid #e9ecef', 
              paddingBottom: '15px',
              marginBottom: '20px'
            }}>
              <h3>📋 Detalles del Pedido</h3>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              {order.items.map((item) => (
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
                      Cantidad: {item.qty}
                    </div>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '16px' }}>
                    {formatPrice(item.price * item.qty)}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ 
              borderTop: '2px solid #e9ecef', 
              paddingTop: '15px',
              marginTop: '20px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#2c3e50'
              }}>
                <span>Total:</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
            
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              
            }}>
              <p style={{ margin: '0', color: '#6c757d', fontSize: '14px' }}>
                💡 En las próximas iteraciones podrás seleccionar tus items y pagar tu parte
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sentry.withProfiler(CheckView);
