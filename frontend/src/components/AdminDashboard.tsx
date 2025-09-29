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
    navigate(`/admin/table/${session.id}/pos`);
  };

  const getStatusColor = (session: QRSession) => {
    if (!session.has_order) return 'bg-gray-100 text-gray-600'; // Gray for no order
    if (session.order?.status === 'paid') return 'bg-green-500 text-white'; // Green for paid
    return 'bg-blue-500 text-white'; // Blue for active order
  };

  const getStatusText = (session: QRSession) => {
    if (!session.has_order) return 'Sin orden';
    if (session.order?.status === 'paid') return 'Pagado';
    return 'Orden activa';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2">Cargando dashboard...</h2>
          <p className="text-gray-600">Por favor espera mientras cargamos las sesiones QR.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Error en Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors duration-200" 
            onClick={fetchSessions}
          >
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div>
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center">
            <Logo width={30} height={30} />
            <h2 className="ml-3 text-2xl font-semibold text-gray-800">Dashboard</h2>
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

        <div className="grid grid-cols-2 gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSessionClick(session)}
              className="relative bg-white border-2 border-gray-200 rounded-lg rounded-tr-none p-4 cursor-pointer transition-all duration-200 shadow-sm hover:border-blue-500 hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* Status badge in top-right corner */}
              <div className={`absolute top-0 right-0 px-3 py-2 text-xs font-medium rounded-bl-lg shadow-sm ${getStatusColor(session)}`}>
                {getStatusText(session)}
              </div>

              {/* Row 1: Table Number */}
              <div className="mb-3 mt-5">
                <h4 className="m-0 text-lg font-semibold text-gray-800">
                  {session.table_number || `Mesa ${session.id.slice(0, 8)}`}
                </h4>
              </div>

              {/* Row 2: Items count */}
              <div className="text-sm mb-2 text-gray-500">
                <strong>Orden:</strong> {session.has_order && session.order ? `${session.order.items.length} items` : '0 items'}
              </div>

              {/* Row 3: Total */}
              <div className="text-base font-semibold text-green-600 mb-2">
                <strong>Total:</strong> {session.has_order && session.order ? formatPrice(session.order.total) : '$0.00'}
              </div>

              {/* Row 4: Created at */}
              <div className="text-xs text-gray-500">
                <strong>Creada:</strong> {session.has_order && session.order ? formatDateTime(session.order.created_at) : '-'}
              </div>
            </div>
          ))}
        </div>

        {sessions.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            <h3 className="text-lg font-medium mb-2">No hay sesiones QR</h3>
            <p>Crea códigos QR desde el <a href="/admin/qr" className="text-blue-500 hover:text-blue-600 underline">Generador de QR</a></p>
          </div>
        )}
      </div>


    </div>
  );
};

export default Sentry.withProfiler(AdminDashboard);
