import React, { useState, useEffect } from 'react';
import * as Sentry from '@sentry/react';

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
  const [sessions, setSessions] = useState<QRSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<QRSession | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    fetchSessions();
    
    // Set up polling every 5 seconds for admin dashboard
    const interval = setInterval(fetchSessions, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/admin/sessions');
      
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
    setSelectedSession(session);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedSession(null);
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
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>🏢 Dashboard Administrativo</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a 
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
            </a>
            <a 
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
            </a>
            <button
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
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
            <div style={{ 
              padding: '10px 15px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '6px',
              border: '1px solid #bbdefb'
            }}>
              <strong>Total QR Codes:</strong> {sessions.length}
            </div>
            <div style={{ 
              padding: '10px 15px', 
              backgroundColor: '#e8f5e8', 
              borderRadius: '6px',
              border: '1px solid #c8e6c9'
            }}>
              <strong>Con Órdenes:</strong> {sessions.filter(s => s.has_order).length}
            </div>
            <div style={{ 
              padding: '10px 15px', 
              backgroundColor: '#fff3e0', 
              borderRadius: '6px',
              border: '1px solid #ffcc02'
            }}>
              <strong>Sin Órdenes:</strong> {sessions.filter(s => !s.has_order).length}
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '15px' 
        }}>
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSessionClick(session)}
              style={{
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                padding: '15px',
                cursor: 'pointer',
                backgroundColor: 'white',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: '0', fontSize: '16px' }}>
                  {session.table_number || `QR-${session.id.slice(0, 8)}`}
                </h4>
                <div style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: getStatusColor(session),
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {getStatusText(session)}
                </div>
              </div>

              <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '10px' }}>
                <strong>QR-ID:</strong> {session.id.slice(0, 8)}...
              </div>

              {session.has_order && session.order ? (
                <div>
                  <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                    <strong>Orden:</strong> {session.order.items.length} items
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#28a745' }}>
                    Total: {formatPrice(session.order.total)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                    Creada: {formatDateTime(session.order.created_at)}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: '#6c757d', fontStyle: 'italic' }}>
                  No hay orden activa
                </div>
              )}

              <div style={{ 
                marginTop: '10px', 
                paddingTop: '10px', 
                borderTop: '1px solid #f8f9fa',
                fontSize: '12px', 
                color: '#6c757d' 
              }}>
                Creado: {formatDateTime(session.created_at)}
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

      {/* Modal for order details */}
      {showModal && selectedSession && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '5px'
              }}
            >
              ✕
            </button>

            <h3 style={{ marginTop: '0' }}>
              {selectedSession.table_number || `QR-${selectedSession.id.slice(0, 8)}`}
            </h3>

            <div style={{ marginBottom: '15px' }}>
              <p><strong>QR-ID:</strong> <code>{selectedSession.id}</code></p>
              <p><strong>Estado:</strong> {getStatusText(selectedSession)}</p>
              <p><strong>Cliente URL:</strong> <a href={`/check/${selectedSession.id}`} target="_blank" rel="noopener noreferrer">/check/{selectedSession.id.slice(0, 8)}...</a></p>
            </div>

            {selectedSession.has_order && selectedSession.order ? (
              <div>
                <h4>📋 Detalles de la Orden</h4>
                <div style={{ marginBottom: '15px' }}>
                  {selectedSession.order.items.map((item, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid #f8f9fa'
                    }}>
                      <div>
                        <div style={{ fontWeight: '500' }}>{item.name}</div>
                        <div style={{ fontSize: '14px', color: '#6c757d' }}>
                          Cantidad: {item.qty} × {formatPrice(item.price)}
                        </div>
                      </div>
                      <div style={{ fontWeight: '600' }}>
                        {formatPrice(item.price * item.qty)}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ 
                  borderTop: '2px solid #e9ecef',
                  paddingTop: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}>
                  <span>Total:</span>
                  <span>{formatPrice(selectedSession.order.total)}</span>
                </div>
                <div style={{ marginTop: '15px' }}>
                  <a 
                    href={`/admin/pos?qrId=${selectedSession.id}`}
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    🛠️ Modificar Orden
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px'
              }}>
                <p>No hay orden activa para esta mesa</p>
                <a 
                  href={`/admin/pos?qrId=${selectedSession.id}`}
                  style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  ➕ Crear Orden
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sentry.withProfiler(AdminDashboard);
