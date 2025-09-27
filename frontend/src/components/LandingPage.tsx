import React from 'react';
import * as Sentry from '@sentry/react';
import SentryHelloWorldButtons from './SentryHelloWorld';
import Logo from './Logo';

const LandingPage: React.FC = () => {
  return (
    <div className="container">
      <div className="card">
        <div className="flex items-center justify-center mb-6">
          <Logo width={80} height={80} className="mr-4" />
          <div>
            <p className="text-gray-600">Paga tu cuenta!</p>
          </div>
        </div>
        
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
