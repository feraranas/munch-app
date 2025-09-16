import React from 'react';
import * as Sentry from '@sentry/react';
import SentryHelloWorldButtons from './SentryHelloWorld';

const LandingPage: React.FC = () => {
  return (
    <div className="container">
      <div className="card">
        <h1>Bienvenido a Las Gaoneras</h1>
        <p>Paga tu cuenta!</p>
        
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <h2>🍽️</h2>
          <p>Para ver tu cuenta, escanea el QR de tu mesa.</p>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>
            O visita <strong>/admin/qr</strong> para generar un QR prueba
          </p>
        </div>
      </div>
      <SentryHelloWorldButtons />
    </div>
  );
};

export default Sentry.withProfiler(LandingPage);
