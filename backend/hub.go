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

	// Inbound messages from the clients.
	broadcast chan []byte

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		sessions:   make(map[string]map[*Client]bool),
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
