import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as Sentry from "@sentry/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

Sentry.init({
  dsn: "https://c9c670e4a82008eb7f2d7bcbc3741f50@o4510028336922624.ingest.us.sentry.io/4510028338429952",
  
  // Enable logging to capture console logs automatically
  enableLogs: true,
  
  // Do not send default PII (e.g. IP addresses) to Sentry. This is a payments
  // app; avoid collecting personal data by default.
  sendDefaultPii: false,

  // Integrations for better logging and error tracking
  integrations: [
    // Forward only warnings and errors to Sentry. `log` is excluded so routine
    // console.log output (which may include payment-adjacent data) is not harvested.
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
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

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Disable refetch on window focus for better UX in restaurant setting
      retry: 1, // Retry failed requests once
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes by default
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);