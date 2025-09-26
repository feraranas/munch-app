import React from 'react';
import * as Sentry from '@sentry/react';
import SentryHelloWorldButtons from './SentryHelloWorld';

const LandingPage: React.FC = () => {
  return (
    <div className="container">
      <div className="card">
        <h1>Bienvenido a Las Gaoneras</h1>
        <p>Paga tu cuenta!</p>
        
        <div className="text-center mt-8">
          <h2>🍽️</h2>
          <p>Para ver tu cuenta, escanea el QR de tu mesa.</p>
          <p className="text-gray-500 text-sm">
            Personal: <strong><a href="/admin" className="text-blue-600 hover:text-blue-800">/admin</a></strong> (dashboard) • <strong><a href="/admin/pos" className="text-blue-600 hover:text-blue-800">/admin/pos</a></strong> (órdenes) • <strong><a href="/admin/qr" className="text-blue-600 hover:text-blue-800">/admin/qr</a></strong> (generar QR)
          </p>
        </div>
      </div>
      <SentryHelloWorldButtons />
    </div>
  );
};

export default Sentry.withProfiler(LandingPage);
