package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
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
	// Item selection fields
	ItemID   string `json:"item_id,omitempty"`
	Selected bool   `json:"selected,omitempty"`
	// Payment fields
	Amount float64 `json:"amount,omitempty"`
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

	// Wait for initial message with QR session info
	_, messageBytes, err := conn.ReadMessage()
	if err != nil {
		log.Printf("Error reading initial message: %v", err)
		// TODO: Hay que manejar este error en Frontend. El usuario debe ser
		// invitado a re-intentar escanear el código QR.
		conn.Close()
		return
	}

	var initMsg Message
	if err := json.Unmarshal(messageBytes, &initMsg); err != nil {
		log.Printf("Error parsing initial message: %v", err)
		// TODO: Hay que manejar este error en Frontend. El usuario debe ser
		// invitado a re-intentar escanear el código QR.
		conn.Close()
		return
	}

	if initMsg.Type != "join_session" || initMsg.QRSession == "" {
		log.Printf("Invalid initial message type or missing QR session")
		// TODO: Hay que manejar este error en Frontend. El usuario debe ser
		// invitado a re-intentar escanear el código QR.
		conn.Close()
		return
	}

	// Generate user ID and avatar
	userID := generateUserID()
	avatar := generateAvatar(userID)

	client := &Client{
		hub:  app.Hub,
		conn: conn,
		send: make(chan []byte, 256),
		user: User{
			ID:        userID,
			QRSession: initMsg.QRSession,
			Avatar:    avatar,
			JoinedAt:  time.Now().Unix(),
		},
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

		// Handle different message types
		switch incomingMsg.Type {
		case "ping":
			// Respond with pong
			pongMsg := Message{
				Type:    "pong",
				Content: "pong",
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
		case "item_selection":
			// Handle item selection/deselection
			log.Printf("User %s %s item %s in session %s",
				c.user.ID,
				map[bool]string{true: "selected", false: "deselected"}[incomingMsg.Selected],
				incomingMsg.ItemID,
				c.user.QRSession)

			// Add user ID to the message before broadcasting
			incomingMsg.UserID = c.user.ID

			// Re-marshal the message with user ID
			messageWithUserID, err := json.Marshal(incomingMsg)
			if err != nil {
				log.Printf("Error marshaling item selection message: %v", err)
				continue
			}

			// Broadcast to all other clients in the same session
			if sessionClients, exists := c.hub.sessions[c.user.QRSession]; exists {
				for client := range sessionClients {
					if client != c { // Don't send back to sender
						select {
						case client.send <- messageWithUserID:
						default:
							close(client.send)
							delete(c.hub.clients, client)
							delete(sessionClients, client)
						}
					}
				}
			}
		case "payment_confirmed":
			// Handle payment confirmation
			log.Printf("User %s confirmed payment of $%.2f in session %s",
				c.user.ID,
				incomingMsg.Amount,
				c.user.QRSession)

			// Add user ID to the message before broadcasting
			incomingMsg.UserID = c.user.ID

			// Re-marshal the message with user ID
			messageWithUserID, err := json.Marshal(incomingMsg)
			if err != nil {
				log.Printf("Error marshaling payment confirmation message: %v", err)
				continue
			}

			// Broadcast to all clients in the same session (including sender for consistency)
			if sessionClients, exists := c.hub.sessions[c.user.QRSession]; exists {
				for client := range sessionClients {
					select {
					case client.send <- messageWithUserID:
					default:
						close(client.send)
						delete(c.hub.clients, client)
						delete(sessionClients, client)
					}
				}
			}
		default:
			// For other messages, broadcast to all clients in the same session
			if sessionClients, exists := c.hub.sessions[c.user.QRSession]; exists {
				for client := range sessionClients {
					if client != c { // Don't send back to sender
						select {
						case client.send <- messageBytes:
						default:
							close(client.send)
							delete(c.hub.clients, client)
							delete(sessionClients, client)
						}
					}
				}
			}
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

// generateUserID creates a random user ID
func generateUserID() string {
	bytes := make([]byte, 4)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// generateAvatar creates a simple avatar identifier
func generateAvatar(userID string) string {
	// Simple avatar based on user ID hash
	hash := 0
	for _, char := range userID {
		hash = int(char) + ((hash << 5) - hash)
	}
	avatarNum := (hash % 10) + 1
	return fmt.Sprintf("avatar_%d", avatarNum)
}
