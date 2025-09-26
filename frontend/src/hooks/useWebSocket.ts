import { useEffect, useRef, useState } from "react";
import { api } from "../config/environment";

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
  // Item selection fields
  item_id?: string;
  selected?: boolean;
  // Payment fields
  amount?: number;
}

export const useWebSocket = ({ qrSessionId }: UseWebSocketProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [itemSelections, setItemSelections] = useState<Map<string, string>>(new Map());
  const [totalPaidByGroup, setTotalPaidByGroup] = useState<number>(0);

  useEffect(() => {
    // Prevent double connections in React Strict Mode
    if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = api.wsSession();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      console.log(`WebSocket connected for QR session: ${qrSessionId}`);
      setIsConnected(true);
      setConnectionError(null);
      
      // Send join session message
      // TODO: Add a check before sending the join_session.
      //   if (wsRef.current?.readyState === WebSocket.OPEN) {}
      // TODO: If initial attempt fails, add a retry mechanism.
      const joinMessage: WebSocketMessage = {
        type: "join_session",
        qr_session: qrSessionId
      };
      ws.send(JSON.stringify(joinMessage));
    });

    ws.addEventListener("message", (e) => {
      try {
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
        
          case "item_selection":
            if (message.item_id && message.user_id !== undefined) {
              setItemSelections(prev => {
                const newSelections = new Map(prev);
                if (message.selected) {
                  newSelections.set(message.item_id!, message.user_id!);
                } else {
                  newSelections.delete(message.item_id!);
                }
                return newSelections;
              });
              console.log(`User ${message.user_id} ${message.selected ? 'selected' : 'deselected'} item ${message.item_id}`);
            }
            break;
          
          case "payment_confirmed":
            if (message.amount && message.user_id) {
              setTotalPaidByGroup(prev => prev + message.amount!);
              console.log(`User ${message.user_id} confirmed payment of $${message.amount}`);
            }
            break;
        
        case "pong":
          console.log("Received pong");
          break;
        
        default:
          console.log("Unknown message type:", message.type);
      }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
        console.error("Raw message data:", e.data);
        setConnectionError("Failed to parse server message");
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

  const sendItemSelection = (itemId: string, selected: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: "item_selection",
        item_id: itemId,
        selected: selected
      };
      wsRef.current.send(JSON.stringify(message));
      console.log(`Sent item selection: ${itemId} - ${selected ? 'selected' : 'deselected'}`);
    } else {
      console.error("WebSocket is not connected, cannot send item selection");
    }
  };

  const sendPaymentConfirmation = (amount: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: "payment_confirmed",
        amount: amount
      };
      wsRef.current.send(JSON.stringify(message));
      console.log(`Sent payment confirmation: $${amount}`);
    } else {
      console.error("WebSocket is not connected, cannot send payment confirmation");
    }
  };

  return { 
    isConnected, 
    connectionError, 
    connectedUsers, 
    itemSelections,
    totalPaidByGroup,
    sendItemSelection,
    sendPaymentConfirmation
  };
};
