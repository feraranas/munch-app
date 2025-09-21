import { useEffect, useRef, useState } from "react";

interface UseWebSocketProps {
  qrSessionId: string;
}

interface User {
  id: string;
  qr_session: string;
  avatar: string;
  joined_at: number;
}

interface WebSocketMessage {
  type: string;
  qr_session?: string;
  user_id?: string;
  content?: string;
  users?: User[];
}

export const useWebSocket = ({ qrSessionId }: UseWebSocketProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);

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
      
      // Send join session message
      const joinMessage: WebSocketMessage = {
        type: "join_session",
        qr_session: qrSessionId
      };
      ws.send(JSON.stringify(joinMessage));
    });

    ws.addEventListener("message", (e) => {
      const message: WebSocketMessage = JSON.parse(e.data);
      console.log(`RECEIVED message for session ${qrSessionId}:`, message);
      
      // Handle different message types
      switch (message.type) {
        case "user_list_update":
          if (message.users) {
            setConnectedUsers(message.users);
            console.log(`Updated user list for session ${qrSessionId}:`, message.users);
          }
          break;
        case "pong":
          console.log("Received pong");
          break;
        default:
          console.log("Unknown message type:", message.type);
      }
    });

    ws.addEventListener("close", () => {
      console.log(`WebSocket disconnected for QR session: ${qrSessionId}`);
      setIsConnected(false);
      //setConnectedUsers([]);
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

  return { isConnected, connectionError, connectedUsers };
};
