package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		allowedOrigins := []string{"http://localhost:3000"}
		origin := r.Header.Get("Origin")
		for _, o := range allowedOrigins {
			if origin == o {
				return true
			}
		}
		return false
	},
}

// Message represents the structure of WebSocket messages
type Message struct {
	Type      string `json:"type"`
	QRSession string `json:"qr_session,omitempty"`
	UserID    string `json:"user_id,omitempty"`
	Content   string `json:"content,omitempty"`
	Users     []User `json:"users,omitempty"`
}

// User represents a connected user
type User struct {
	ID        string `json:"id"`
	QRSession string `json:"qr_session"`
	Avatar    string `json:"avatar"`
	JoinedAt  int64  `json:"joined_at"`
}

type Client struct {
	hub *Hub

	// The websocket connection.
	conn *websocket.Conn

	// Buffered channel of outbound messages.
	send chan []byte

	// User information
	user User
}

// webSocketHandler handles websocket requests from the peer.
func (app *App) webSocketHandler(c *gin.Context) {

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upgrade HTTP to WS"})
		return
	}

	client := &Client{
		hub:  app.Hub,
		conn: conn,
		send: make(chan []byte, 256),
	}

	// Register the client with the hub
	client.hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writePump()
	go client.readPump()
}

// readPump pumps messages from the websocket connection to the hub.
//
// The application runs readPump in a per-connection goroutine.
// The application ensures that there is at most one reader on a
// connection by executing all reads from this goroutine.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		// Parse the incoming message
		var incomingMsg Message
		if err := json.Unmarshal(messageBytes, &incomingMsg); err != nil {
			log.Printf("Error parsing message: %v", err)
			continue
		}

		// If it's a ping message, respond with pong
		if incomingMsg.Content == "ping" {
			pongMsg := Message{
				Iteration: incomingMsg.Iteration,
				Content:   "pong",
			}

			pongBytes, err := json.Marshal(pongMsg)
			if err != nil {
				log.Printf("Error marshaling pong message: %v", err)
				continue
			}

			// Send pong directly to this client only
			select {
			case c.send <- pongBytes:
			default:
				close(c.send)
				return
			}
		} else {
			// For non-ping messages, broadcast to all clients
			c.hub.broadcast <- messageBytes
		}
	}
}

// writePump pumps messages from the hub to the websocket connection
//
// A goroutine running writePump is started for each connection.
// The application ensures that there is at most one writer to a
// connection by executing all writes from this goroutine
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message.
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
