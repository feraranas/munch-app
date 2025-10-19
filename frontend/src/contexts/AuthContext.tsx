import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as apiLogin, logout as apiLogout, validateToken } from '../services/auth';

interface User {
  username: string;
  role: string;
  userId: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// This creates a container for the authentication data.
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        try {
          // Validate token with backend
          const validation = await validateToken(storedToken);
          if (validation.valid && validation.username) {
            setToken(storedToken);
            setUser({
              username: validation.username,
              role: validation.role || 'staff',
              userId: validation.user_id || '',
            });
          } else {
            // Token is invalid, remove it
            localStorage.removeItem('auth_token');
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          localStorage.removeItem('auth_token');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await apiLogin(username, password);
      setToken(response.token);
      setUser({
        username: response.username,
        role: response.role,
        userId: response.user_id || '',
      });
      localStorage.setItem('auth_token', response.token);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await apiLogout(token);
      }
    } catch (error) {
      console.error('Logout request failed:', error);
      // Continue with local logout even if API call fails
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('auth_token');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Hook to require authentication (for protected pages)
export const useRequireAuth = (): AuthContextType => {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // Redirect will be handled by ProtectedRoute component
      console.log('Authentication required');
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  return auth;
};

