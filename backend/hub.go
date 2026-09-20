package main

import (
	"encoding/json"
	"log"
)

// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// QR session to clients mapping
	sessions map[string]map[*Client]bool

	// Durable + in-memory item claims (session-scoped).
	claims *ClaimStore

	// Inbound messages from the clients.
	broadcast chan []byte

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client
}

func NewHub(claims *ClaimStore) *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		sessions:   make(map[string]map[*Client]bool),
		claims:     claims,
	}
}

func (h *Hub) Run() {
	for {
		select {

		// When Hub.Run() receives the client:
		case client := <-h.register:
			// Adds the client to h.clients
			h.clients[client] = true

			// Add client to their QR session
			// Adds the client to h.sessions[qrSession]
			qrSession := client.user.QRSession
			if h.sessions[qrSession] == nil {
				h.sessions[qrSession] = make(map[*Client]bool)
			}
			h.sessions[qrSession][client] = true

			log.Printf("User %s joined session %s", client.user.ID, qrSession)

			// Load durable claims for this session (no-op if already in memory)
			if h.claims != nil {
				if err := h.claims.LoadSession(qrSession); err != nil {
					log.Printf("Error loading claims for session %s: %v", qrSession, err)
				}
			}

			// Tell the joining client their assigned user ID (needed to restore own claims)
			h.sendJoinAck(client)

			// Replay persisted claims so selections survive backend restart / late join
			h.sendClaimsToClient(client)

			// Broadcast user list update to all clients in this session
			// Broadcasts a user list update to the session
			h.broadcastUserListToSession(qrSession)

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				close(client.send)
				qrSession := client.user.QRSession
				stillActive := h.removeClientFromSession(client)
				if stillActive {
					h.broadcastUserListToSession(qrSession)
				}
				log.Printf("User %s left session %s", client.user.ID, qrSession)
			}

		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					h.removeClientFromSession(client)
				}
			}
		}
	}
}

// removeClientFromSession removes client from the global and per-session maps.
// If that was the last client in the session, unloads the in-memory claims cache
// (same cleanup as a normal unregister). Caller is responsible for closing send.
// Returns true if other clients remain in the session.
func (h *Hub) removeClientFromSession(client *Client) bool {
	delete(h.clients, client)

	qrSession := client.user.QRSession
	sessionClients, exists := h.sessions[qrSession]
	if !exists {
		return false
	}
	delete(sessionClients, client)
	if len(sessionClients) == 0 {
		delete(h.sessions, qrSession)
		if h.claims != nil {
			h.claims.UnloadSession(qrSession)
		}
		return false
	}
	return true
}

// isUserConnectedInSession reports whether userID currently has a live client
// in qrSession. Used to allow reclaim of abandoned claims (owner tab closed).
func (h *Hub) isUserConnectedInSession(qrSession, userID string) bool {
	sessionClients, exists := h.sessions[qrSession]
	if !exists {
		return false
	}
	for client := range sessionClients {
		if client.user.ID == userID {
			return true
		}
	}
	return false
}

// sendJoinAck informs the joining client of its server-assigned user ID.
func (h *Hub) sendJoinAck(client *Client) {
	message := Message{
		Type:      "join_ack",
		UserID:    client.user.ID,
		QRSession: client.user.QRSession,
	}
	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling join_ack: %v", err)
		return
	}
	select {
	case client.send <- messageBytes:
	default:
		log.Printf("Failed to send join_ack to user %s", client.user.ID)
	}
}

// sendClaimsToClient replays current session claims as item_selection messages.
func (h *Hub) sendClaimsToClient(client *Client) {
	if h.claims == nil {
		return
	}
	claims := h.claims.GetSession(client.user.QRSession)
	for itemID, userID := range claims {
		message := Message{
			Type:      "item_selection",
			QRSession: client.user.QRSession,
			ItemID:    itemID,
			UserID:    userID,
			Selected:  true,
		}
		messageBytes, err := json.Marshal(message)
		if err != nil {
			log.Printf("Error marshaling claim replay: %v", err)
			continue
		}
		select {
		case client.send <- messageBytes:
		default:
			log.Printf("Failed to send claim replay to user %s", client.user.ID)
		}
	}
}

// broadcastUserListToSession sends the current user list to all clients in a session
func (h *Hub) broadcastUserListToSession(qrSession string) {
	sessionClients, exists := h.sessions[qrSession]
	if !exists || len(sessionClients) == 0 {
		return
	}

	// Build user list for this session
	var users []User
	for client := range sessionClients {
		users = append(users, client.user)
	}

	// Create message with user list
	message := Message{
		Type:      "user_list_update",
		QRSession: qrSession,
		Users:     users,
	}

	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling user list message: %v", err)
		return
	}

	// Send to all clients in this session
	for client := range sessionClients {
		select {
		case client.send <- messageBytes:
		default:
			close(client.send)
			h.removeClientFromSession(client)
		}
	}
}

// broadcastToSession sends messageBytes to clients in qrSession.
// If exclude is non-nil, that client is skipped (live claim broadcasts).
func (h *Hub) broadcastToSession(qrSession string, messageBytes []byte, exclude *Client) {
	sessionClients, exists := h.sessions[qrSession]
	if !exists {
		return
	}
	for client := range sessionClients {
		if exclude != nil && client == exclude {
			continue
		}
		select {
		case client.send <- messageBytes:
		default:
			close(client.send)
			h.removeClientFromSession(client)
		}
	}
}
