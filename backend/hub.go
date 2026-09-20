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
				delete(h.clients, client)
				close(client.send)

				// Remove client from their QR session
				qrSession := client.user.QRSession
				if sessionClients, exists := h.sessions[qrSession]; exists {
					delete(sessionClients, client)
					if len(sessionClients) == 0 {
						delete(h.sessions, qrSession)
						// Drop in-memory claims cache; DB rows remain for restart restore
						if h.claims != nil {
							h.claims.UnloadSession(qrSession)
						}
					} else {
						// Broadcast updated user list to remaining clients in session
						h.broadcastUserListToSession(qrSession)
					}
				}

				log.Printf("User %s left session %s", client.user.ID, qrSession)
			}

		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
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
			delete(h.clients, client)
			delete(sessionClients, client)
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
			delete(h.clients, client)
			delete(sessionClients, client)
		}
	}
}
