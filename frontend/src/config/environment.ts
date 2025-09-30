// Environment configuration for the frontend
// This centralizes all API endpoints and configuration

interface AppConfig {
  apiUrl: string;
  wsUrl: string;
  frontendUrl: string;
}

const getConfig = (): AppConfig => {
  // Get environment variables with fallbacks for development
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
  const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';
  const frontendUrl = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';

  return {
    apiUrl,
    wsUrl,
    frontendUrl,
  };
};

export const config = getConfig();

// Helper functions for common API calls
export const api = {
  baseUrl: config.apiUrl,
  
  // API endpoints
  qr: (orderId: string) => `${config.apiUrl}/api/qr/${orderId}`,
  orders: (orderId: string) => `${config.apiUrl}/api/orders/${orderId}`,
  menuItems: () => `${config.apiUrl}/api/menu/items`,
  generateQr: () => `${config.apiUrl}/api/qr/generate`,
  createQr: () => `${config.apiUrl}/api/qr/create`,
  mockOrder: () => `${config.apiUrl}/api/pos/mock-order`,
  posOrder: () => `${config.apiUrl}/api/pos/order`,
  updateOrder: () => `${config.apiUrl}/api/orders/update`,
  adminSessions: () => `${config.apiUrl}/api/admin/sessions`,
  
  // WebSocket endpoints
  wsSession: (sessionId?: string) => 
    sessionId 
      ? `${config.wsUrl}/ws/session/${sessionId}`
      : `${config.wsUrl}/ws/session`,
};

// Frontend URL helpers
export const frontend = {
  baseUrl: config.frontendUrl,
  checkUrl: (orderId: string) => `${config.frontendUrl}/check/${orderId}`,
  adminUrl: (path: string) => `${config.frontendUrl}/admin/${path}`,
};

export default config;
