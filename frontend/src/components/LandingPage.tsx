import React, { useState } from 'react';
import * as Sentry from '@sentry/react';
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
          
          <div className="mt-6">
            <a
              href="/login"
              className="inline-block px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
            >
              Acceso de Personal
            </a>
          </div>
        </div>
      </div>
    </div>  
  );
};

export default Sentry.withProfiler(LandingPage);
