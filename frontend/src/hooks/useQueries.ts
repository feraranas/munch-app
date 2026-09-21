import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMenuItems,
  fetchAdminMenuItems,
  fetchAllSessions,
  fetchQRSession,
  createPOSOrder,
  updateOrder,
  createMenuItem,
  updateMenuItem,
  archiveMenuItem,
  QRSession,
  QRSessionResponse,
  CreateOrderPayload,
  CreateMenuItemPayload,
  UpdateMenuItemPayload,
} from '../services/api';

// Query Keys - Centralized for consistency
export const queryKeys = {
  menuItems: ['menu-items'] as const,
  adminMenuItems: ['admin-menu-items'] as const,
  adminSessions: ['admin-sessions'] as const,
  qrSession: (qrId: string) => ['qr-session', qrId] as const,
};

/**
 * Hook to fetch menu items with caching
 * Data is considered fresh for 30 minutes
 */
export const useMenuItems = () => {
  return useQuery({
    queryKey: queryKeys.menuItems,
    queryFn: fetchMenuItems,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // Cache for 1 hour (formerly cacheTime)
  });
};

/**
 * Hook to fetch all admin sessions with automatic polling
 * Refetches every 5 seconds when component is mounted
 */
export const useAdminSessions = () => {
  return useQuery({
    queryKey: queryKeys.adminSessions,
    queryFn: fetchAllSessions,
    refetchInterval: 200000, // Poll every 3 minutes
    refetchIntervalInBackground: false, // Don't poll when tab is not active
  });
};

/**
 * Hook to fetch a specific QR session
 * Useful for check view and POS view
 */
export const useQRSession = (qrId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.qrSession(qrId || ''),
    queryFn: () => fetchQRSession(qrId || ''),
    enabled: !!qrId, // Only run query if qrId exists
    refetchInterval: 60000, // Poll every 60 seconds for updates
    refetchIntervalInBackground: false,
  });
};

/**
 * Mutation hook to create a POS order
 * Automatically invalidates related queries on success
 */
export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => createPOSOrder(payload),
    onSuccess: (data, variables) => {
      // Invalidate admin sessions to show updated order
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSessions });
      
      // Invalidate the specific QR session
      queryClient.invalidateQueries({ queryKey: queryKeys.qrSession(variables.qrId) });
      
      console.log('Order created successfully:', data);
    },
    onError: (error) => {
      console.error('Failed to create order:', error);
    },
  });
};

/**
 * Mutation hook to update an existing order
 * Automatically invalidates related queries on success
 */
export const useUpdateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) => updateOrder(payload),
    onSuccess: (data, variables) => {
      // Invalidate admin sessions
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSessions });
      
      // Invalidate the specific QR session if qrId is provided
      if (variables.qrId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.qrSession(variables.qrId) });
      }
      
      console.log('Order updated successfully:', data);
    },
    onError: (error) => {
      console.error('Failed to update order:', error);
    },
  });
};

export const useAdminMenuItems = () => {
  return useQuery({
    queryKey: queryKeys.adminMenuItems,
    queryFn: fetchAdminMenuItems,
  });
};

const invalidateMenuCatalog = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.menuItems });
  queryClient.invalidateQueries({ queryKey: queryKeys.adminMenuItems });
};

export const useCreateMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMenuItemPayload) => createMenuItem(payload),
    onSuccess: () => invalidateMenuCatalog(queryClient),
  });
};

export const useUpdateMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMenuItemPayload }) =>
      updateMenuItem(id, payload),
    onSuccess: () => invalidateMenuCatalog(queryClient),
  });
};

export const useArchiveMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveMenuItem(id),
    onSuccess: () => invalidateMenuCatalog(queryClient),
  });
};
