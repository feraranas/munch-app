import { useEffect, useRef, useCallback, useState } from 'react';

export interface WSMessage {
  type: string;
  payload: any;
}

export interface SessionInfo {
  qr_session_id: string;
  viewer_count: number;
}

export interface OrderUpdatePayload {
  qr_session_id: string;
  order: any;
  has_order: boolean;
}

interface UseWebSocketOptions {
  onOrderUpdate?: (payload: OrderUpdatePayload) => void;
  onViewerCountUpdate?: (sessionInfo: SessionInfo) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export const useWebSocket = (qrSessionId: string, options: UseWebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  const connect = useCallback(() => {
    if (!qrSessionId) return;

    try {
      const wsUrl = `ws://localhost:8080/ws/session/${qrSessionId}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected for session:', qrSessionId);
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        options.onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'viewer_count':
              const sessionInfo = message.payload as SessionInfo;
              setViewerCount(sessionInfo.viewer_count);
              options.onViewerCountUpdate?.(sessionInfo);
              break;
              
            case 'order_update':
              const orderUpdate = message.payload as OrderUpdatePayload;
              options.onOrderUpdate?.(orderUpdate);
              break;
              
            default:
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;
        options.onDisconnect?.();

        // Auto-reconnect logic
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else {
          setError('Connection lost. Please refresh the page.');
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error occurred');
        options.onError?.(event);
      };

    } catch (err) {
      console.error('Error creating WebSocket connection:', err);
      setError('Failed to establish connection');
    }
  }, [qrSessionId, options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    viewerCount,
    error,
    sendMessage,
    disconnect,
    reconnect: connect
  };
};