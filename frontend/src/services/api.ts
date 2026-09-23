import { api } from '../config/environment';

// Helper to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Helper to create headers with auth token
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Types
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  toppings?: { name: string; price: number }[];
}

export interface AdminMenuItem extends MenuItem {
  active: boolean;
}

export interface OrderItem {
  id: string;
  menuId: string;
  name: string;
  price: number;
  qty: number;
  toppings?: { name: string; price: number }[];
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: number;
}

export interface QRSession {
  id: string;
  table_number?: string;
  created_at: number;
  updated_at: number;
  has_order: boolean;
  paid_item_ids?: string[];
  order?: Order;
}

export interface SessionsResponse {
  sessions: QRSession[];
}

export interface MenuItemsResponse {
  items: MenuItem[];
}

export interface AdminMenuItemsResponse {
  items: AdminMenuItem[];
}

export interface CreateMenuItemPayload {
  id?: string;
  name: string;
  price: number;
}

export interface UpdateMenuItemPayload {
  name?: string;
  price?: number;
  active?: boolean;
}

export interface QRSessionResponse {
  qr_id: string;
  table_number?: string;
  has_order: boolean;
  paid_item_ids?: string[];
  message?: string;
  order?: Order;
}

export interface CreateQRSessionPayload {
  tableNumber?: string;
}

export interface CreateQRSessionResponse {
  qrCodeUrl: string;
  qrId: string;
  checkUrl: string;
  tableNumber?: string;
}

export interface CreateOrderPayload {
  qrId: string;
  selectedItems: {
    id: string;
    menuId: string;
    qty: number;
    toppings?: { name: string; price: number }[];
  }[];
}

export interface PaymentIntentPayload {
  order_id: string;
  item_ids: string[];
}

export interface PaymentIntentResponse {
  client_secret?: string;
  payment_id: string;
  amount: number; // centavos MXN
  currency: string;
  mock?: boolean;
  message?: string;
}

// API Functions
export const fetchMenuItems = async (): Promise<MenuItem[]> => {
  const response = await fetch(api.menuItems());
  if (!response.ok) {
    throw new Error(`Failed to fetch menu items: ${response.statusText}`);
  }
  const data: MenuItemsResponse = await response.json();
  return data.items;
};

export const fetchAdminMenuItems = async (): Promise<AdminMenuItem[]> => {
  const response = await fetch(api.adminMenuItems(), {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch admin menu items: ${response.statusText}`);
  }
  const data: AdminMenuItemsResponse = await response.json();
  return data.items || [];
};

export const createMenuItem = async (payload: CreateMenuItemPayload): Promise<AdminMenuItem> => {
  const response = await fetch(api.menuItems(), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create menu item');
  }
  return response.json();
};

export const updateMenuItem = async (
  id: string,
  payload: UpdateMenuItemPayload
): Promise<AdminMenuItem> => {
  const response = await fetch(api.menuItem(id), {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update menu item');
  }
  return response.json();
};

export const archiveMenuItem = async (id: string): Promise<{ id: string; active: boolean }> => {
  const response = await fetch(api.menuItem(id), {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to archive menu item');
  }
  return response.json();
};

export const fetchAllSessions = async (): Promise<QRSession[]> => {
  const response = await fetch(api.adminSessions(), {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.statusText}`);
  }
  const data: SessionsResponse = await response.json();
  // Defensive check: return empty array if sessions is null/undefined
  return data.sessions || [];
};

export const createQRSession = async (
  payload: CreateQRSessionPayload
): Promise<CreateQRSessionResponse> => {
  const response = await fetch(api.createQr(), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create QR session');
  }
  return response.json();
};

export const fetchQRSession = async (qrId: string): Promise<QRSessionResponse> => {
  const response = await fetch(api.qr(qrId));
  if (!response.ok) {
    throw new Error(`QR session not found: ${response.statusText}`);
  }
  const data: QRSessionResponse = await response.json();
  return data;
};

export const createPOSOrder = async (payload: CreateOrderPayload): Promise<any> => {
  const response = await fetch(api.posOrder(), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create order');
  }

  return response.json();
};

export const updateOrder = async (payload: any): Promise<any> => {
  const response = await fetch(api.updateOrder(), {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update order');
  }

  return response.json();
};

export const createPaymentIntent = async (payload: PaymentIntentPayload): Promise<PaymentIntentResponse> => {
  const response = await fetch(api.paymentIntents(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create payment intent');
  }

  return response.json();
};
