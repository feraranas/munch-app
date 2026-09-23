import React from 'react';
import { Link } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { useAdminSessions } from '../hooks/useQueries';
import Header from './Header';
import SessionGrid from './SessionGrid';

const AdminDashboard: React.FC = () => {
  // Use TanStack Query hook for sessions with automatic polling
  const { data: sessions = [], isLoading, error, refetch } = useAdminSessions();

  if (isLoading) {
    return (
      <div className="min-h-screen grid-notebook-bg">
        <Header title="Dashboard" />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 md:px-6 py-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-2">Cargando dashboard...</h2>
            <p className="text-gray-600">Por favor espera mientras cargamos las sesiones QR.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen grid-notebook-bg">
        <Header title="Dashboard" />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 md:px-6 py-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-2 text-red-600">Error en Dashboard</h2>
            <p className="text-gray-600 mb-4">{error instanceof Error ? error.message : 'Failed to load sessions'}</p>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors duration-200"
              onClick={() => refetch()}
            >
              🔄 Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-notebook-bg">
      <Header title="Dashboard" />

      <div className="max-w-2xl mx-auto px-8 sm:px-6 md:px-6 py-6">
        <div className="mb-4 flex gap-2">
          <Link
            to="/admin/qr"
            className="inline-block bg-white border border-gray-200 shadow-sm rounded-md px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Generador de QR
          </Link>
          <Link
            to="/admin/menu"
            className="inline-block bg-white border border-gray-200 shadow-sm rounded-md px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Menú
          </Link>
        </div>
        <SessionGrid sessions={sessions} />
      </div>
    </div>
  );
};

export default Sentry.withProfiler(AdminDashboard);

