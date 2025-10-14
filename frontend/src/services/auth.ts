import { api } from '../config/environment';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  role: string;
  user_id?: string;
}

export interface ValidateResponse {
  valid: boolean;
  username?: string;
  role?: string;
  user_id?: string;
}

/**
 * Login with username and password
 */
export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${api.base()}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(errorData.error || 'Invalid credentials');
  }

  return response.json();
};

/**
 * Logout (client-side token removal + optional server notification)
 */
export const logout = async (token: string): Promise<void> => {
  try {
    await fetch(`${api.base()}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error('Logout API call failed:', error);
    // Don't throw - local logout should still proceed
  }
};

/**
 * Validate a JWT token
 */
export const validateToken = async (token: string): Promise<ValidateResponse> => {
  const response = await fetch(`${api.base()}/auth/validate`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return { valid: false };
  }

  return response.json();
};

