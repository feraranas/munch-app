import { useEffect, useRef, useState } from "react";

interface UseWebSocketProps {
  qrSessionId: string;
}

export const useWebSocket = ({ qrSessionId }: UseWebSocketProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // Prevent double connections in React Strict Mode
    if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `ws://localhost:8080/ws/session`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      console.log(`WebSocket connected for QR session: ${qrSessionId}`);
      setIsConnected(true);
      setConnectionError(null);
    });

    ws.addEventListener("message", (e) => {
      const message = JSON.parse(e.data);
      console.log(`RECEIVED message for session ${qrSessionId}:`, message);
    });

    ws.addEventListener("close", () => {
      console.log(`WebSocket disconnected for QR session: ${qrSessionId}`);
      setIsConnected(false);
    });

    ws.addEventListener("error", () => {
      console.error(`WebSocket ERROR for QR session: ${qrSessionId}`);
      setConnectionError("Failed to connect to server");
      setIsConnected(false);
    });

    // Cleanup on pagehide (bfcache-safe)
    const handlePageHide = () => {
      console.log(`CLOSING WebSocket on pagehide for session: ${qrSessionId}`);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
    window.addEventListener("pagehide", handlePageHide);

    // Cleanup when component unmounts
    return () => {
      console.log(`Cleanup WebSocket on unmount for session: ${qrSessionId}`);
      window.removeEventListener("pagehide", handlePageHide);
      
      // Only close if the WebSocket is in a valid state to be closed
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      
      // Clear the WebSocket ref
      wsRef.current = null;
    };
  }, [qrSessionId]); // Re-run when qrSessionId changes

  return { isConnected, connectionError };
};
