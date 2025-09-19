import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import CheckView from './components/CheckView';
import QRGenerator from './components/QRGenerator';
import WaitstaffMenu from './components/WaitstaffMenu';
import AdminDashboard from './components/AdminDashboard';
import * as Sentry from "@sentry/react";

// Root layout component
const RootLayout: React.FC = () => {
  return (
    <div className="App">
      <Outlet />
    </div>
  );
};

// Create the router with v7 data router API
const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: "check/:orderId",
        element: <CheckView />,
      },
      {
        path: "admin/qr",
        element: <QRGenerator />,
      },
      {
        path: "admin/pos",
        element: <WaitstaffMenu />,
      },
      {
        path: "admin",
        element: <AdminDashboard />,
      },
    ],
  },
]);

// Wrap the router with Sentry for enhanced error tracking
const SentryRouter = Sentry.withSentryRouting(RouterProvider);

const App: React.FC = () => {
  return <SentryRouter router={router} />;
};

export default App;
