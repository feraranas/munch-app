import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { api } from '../config/environment';
import Logo from './Logo';

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

interface QRSession {
  id: string;
  table_number?: string;
  created_at: number;
  updated_at: number;
  has_order: boolean;
  order?: Order;
}

interface SessionsResponse {
  sessions: QRSession[];
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<QRSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
    
    // Set up polling every 5 seconds for admin dashboard
    const interval = setInterval(fetchSessions, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch(api.adminSessions());
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.statusText}`);
      }
      
      const data: SessionsResponse = await response.json();
      setSessions(data.sessions);
      setError(null);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSessionClick = (session: QRSession) => {
    navigate(`/admin/table/${session.id}`);
  };

  const getStatusColor = (session: QRSession) => {
    if (!session.has_order) return '#6c757d'; // Gray for no order
    if (session.order?.status === 'paid') return '#28a745'; // Green for paid
    return '#007bff'; // Blue for active order
  };

  const getStatusText = (session: QRSession) => {
    if (!session.has_order) return 'Sin orden';
    if (session.order?.status === 'paid') return 'Pagado';
    return 'Orden activa';
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <h2>Cargando dashboard...</h2>
          <p>Por favor espera mientras cargamos las sesiones QR.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <h2>Error en Dashboard</h2>
          <p>{error}</p>
          <button className="btn" onClick={fetchSessions}>
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Logo width={30} height={30} />
            <h2 style={{ marginLeft: '12px', margin: '0 0 0 12px' }}>Dashboard</h2>
          </div>
          
          {/* <div style={{ display: 'flex', gap: '10px' }}>   */}
            {/* <a 
              href="/admin/qr"
              style={{
                padding: '8px 16px',
                backgroundColor: '#6f42c1',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              🖼️ Crear QR
            </a> */}
            
            {/* <a
              href="/admin/pos"
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              🍽️ POS
            </a> */}
            
            {/* <button
              onClick={fetchSessions}
              className="btn"
              style={{ 
                backgroundColor: '#28a745', 
                borderColor: '#28a745',
                padding: '8px 16px',
                fontSize: '14px'
              }}
            >
              🔄 Actualizar
            </button> */}

          {/* </div> */}
        </div>

        {/* <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}> */}
            
            {/* <div style={{ 
              padding: '10px 15px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '6px',
              border: '1px solid #bbdefb'
            }}>
              <strong>Total QR Codes:</strong> {sessions.length}
            </div> */}
            
            {/* <div style={{ 
              padding: '10px 15px', 
              backgroundColor: '#e8f5e8', 
              borderRadius: '6px',
              border: '1px solid #c8e6c9'
            }}>
              <strong>Con Órdenes:</strong> {sessions.filter(s => s.has_order).length}
            </div> */}
            
            {/* <div style={{ 
              padding: '10px 15px', 
              backgroundColor: '#fff3e0', 
              borderRadius: '6px',
              border: '1px solid #ffcc02'
            }}>
              <strong>Sin Órdenes:</strong> {sessions.filter(s => !s.has_order).length}
            </div> */}

          {/* </div>
        </div> */}

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '15px' 
        }}>
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSessionClick(session)}
              style={{
                border: '2px solid #e9ecef',
                borderRadius: '8px 0px 8px 8px',
                padding: '15px',
                cursor: 'pointer',
                backgroundColor: 'white',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#007bff';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e9ecef';
                e.currentTarget.style.transform = 'translateY(0px)';
              }}
            >
              {/* Status badge in top-right corner */}
              <div style={{
                position: 'absolute',
                top: '0',
                right: '0',
                padding: '8px 12px',
                backgroundColor: getStatusColor(session),
                color: 'white',
                fontSize: '12px',
                fontWeight: '500',
                borderRadius: '0 0 0 8px'
              }}>
                {getStatusText(session)}
              </div>

              {/* Row 1: Table Number */}
              <div style={{ marginBottom: '12px', marginTop: '20px' }}>
                <h4 style={{ margin: '0', fontSize: '18px', fontWeight: '600' }}>
                  {session.table_number || `Mesa ${session.id.slice(0, 8)}`}
                </h4>
              </div>

              {/* Row 2: Items count */}
              <div style={{ fontSize: '14px', marginBottom: '8px', color: '#6c757d' }}>
                <strong>Orden:</strong> {session.has_order && session.order ? `${session.order.items.length} items` : '0 items'}
              </div>

              {/* Row 3: Total */}
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#28a745', marginBottom: '8px' }}>
                <strong>Total:</strong> {session.has_order && session.order ? formatPrice(session.order.total) : '$0.00'}
              </div>

              {/* Row 4: Created at */}
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                <strong>Creada:</strong> {session.has_order && session.order ? formatDateTime(session.order.created_at) : '-'}
              </div>
            </div>
          ))}
        </div>

        {sessions.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            color: '#6c757d' 
          }}>
            <h3>No hay sesiones QR</h3>
            <p>Crea códigos QR desde el <a href="/admin/qr">Generador de QR</a></p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Sentry.withProfiler(AdminDashboard);
