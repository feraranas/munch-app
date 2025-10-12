import { api } from '../config/environment';

// Types
export interface MenuItem {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  menuId: string;
  name: string;
  price: number;
  qty: number;
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
  order?: Order;
}

export interface SessionsResponse {
  sessions: QRSession[];
}

export interface MenuItemsResponse {
  items: MenuItem[];
}

export interface QRSessionResponse {
  qr_id: string;
  table_number?: string;
  has_order: boolean;
  message?: string;
  order?: Order;
}

export interface CreateOrderPayload {
  qrId: string;
  selectedItems: {
    id: string;
    menuId: string;
    qty: number;
  }[];
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

export const fetchAllSessions = async (): Promise<QRSession[]> => {
  const response = await fetch(api.adminSessions());
  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.statusText}`);
  }
  const data: SessionsResponse = await response.json();
  // Defensive check: return empty array if sessions is null/undefined
  return data.sessions || [];
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
    headers: {
      'Content-Type': 'application/json',
    },
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
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update order');
  }

  return response.json();
};
