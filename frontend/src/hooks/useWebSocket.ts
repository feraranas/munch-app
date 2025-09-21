import { useEffect, useRef, useState } from "react";

export const useWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const [counter, setCounter] = useState<number>(0);
  const counterRef = useRef<number>(0);
  const pingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Prevent double connections in React Strict Mode
    if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `ws://localhost:8080/ws/session`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      console.log("Connected wuuuu");

      pingIntervalRef.current = window.setInterval(() => {
        const message = {
          iteration: counterRef.current,
          content: "ping",
        };
        console.log(`SENT: ping: ${counterRef.current}`);
        ws.send(JSON.stringify(message));
      }, 1000);
    });

    ws.addEventListener("message", (e) => {
      const message = JSON.parse(e.data);
      console.log(`RECEIVED: ${message.iteration}: ${message.content}`);
      counterRef.current = counterRef.current + 1;
      setCounter(counterRef.current);
    });

    ws.addEventListener("close", () => {
      console.log("DISCONNECTED");
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    });

    ws.addEventListener("error", () => {
      console.error("WebSocket ERROR");
    });

    // Cleanup on pagehide (bfcache-safe)
    const handlePageHide = () => {
      console.log("CLOSING on pagehide");
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };
    window.addEventListener("pagehide", handlePageHide);

    // Cleanup when component unmounts
    return () => {
      console.log("Cleanup on unmount");
      window.removeEventListener("pagehide", handlePageHide);
      
      // Only close if the WebSocket is in a valid state to be closed
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      // Clear the WebSocket ref
      wsRef.current = null;
    };
  }, []); // Run only once on mount

  return { counter };
};
