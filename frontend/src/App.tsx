import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import CheckView from './components/CheckView';
import QRGenerator from './components/QRGenerator';
import WaitstaffMenu from './components/WaitstaffMenu';
import AdminDashboard from './components/AdminDashboard';
import BottomNavBar from './components/BottomNavBar';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import * as Sentry from "@sentry/react";
import POSView from './components/POSView';
import ClientMenuView from './components/ClientMenuView';
import AdminMenuPage from './components/AdminMenuPage';

// Root layout component
const RootLayout: React.FC = () => {
  const { user } = useAuth();
  
  // Show bottom nav only for unauthenticated users (clients)
  // Authenticated users (admins) don't need the bottom nav
  const shouldShowBottomNav = !user;
  
  return (
    <div className="App">
      <Outlet />
      {shouldShowBottomNav && <BottomNavBar />}
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
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "check/:orderId",
        element: <CheckView />,
      },
      {
        path: "menu",
        element: <ClientMenuView />,
      },
      {
        path: "admin/qr",
        element: (
          <ProtectedRoute>
            <QRGenerator />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/pos",
        element: (
          <ProtectedRoute>
            <WaitstaffMenu />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin",
        element: (
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/menu",
        element: (
          <ProtectedRoute>
            <AdminMenuPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/table/:tableId/pos",
        element: (
          <ProtectedRoute>
            <POSView />
          </ProtectedRoute>
        ),
      }
    ],
  },
]);

// Wrap the router with Sentry for enhanced error tracking
const SentryRouter = Sentry.withSentryRouting(RouterProvider);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SentryRouter router={router} />
    </AuthProvider>
  );
};

export default App;
