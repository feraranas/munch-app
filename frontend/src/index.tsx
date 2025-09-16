import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://c9c670e4a82008eb7f2d7bcbc3741f50@o4510028336922624.ingest.us.sentry.io/4510028338429952",
  
  // Enable logging to capture console logs automatically
  enableLogs: true,
  
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  
  // Integrations for better logging and error tracking
  integrations: [
    // Send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    // React Router v7 integration for automatic route tracking
    Sentry.reactRouterV7BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation: require("react-router-dom").useLocation,
      useNavigationType: require("react-router-dom").useNavigationType,
      createRoutesFromChildren: require("react-router-dom").createRoutesFromChildren,
      matchRoutes: require("react-router-dom").matchRoutes,
    }),
  ],
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
