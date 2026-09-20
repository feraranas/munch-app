package main

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ClaimTTL is how long a durable claim remains valid without refresh.
// Abandoned claims (e.g. tab closed → new fingerprint/user ID) expire on LoadSession.
const ClaimTTL = 45 * time.Minute

// ClaimStore keeps per-session item claims in memory for live WS broadcasts
// and persists them to the database so they survive backend restarts.
type ClaimStore struct {
	db  *gorm.DB
	mu  sync.RWMutex
	mem map[string]map[string]string // qrSession -> itemID -> userID
}

func NewClaimStore(db *gorm.DB) *ClaimStore {
	return &ClaimStore{
		db:  db,
		mem: make(map[string]map[string]string),
	}
}

// LoadSession populates the in-memory map for a QR session from the DB.
// Expired claims (updated_at older than ClaimTTL) are deleted first.
// Safe to call repeatedly; a session already present in memory is left as-is
// (including an empty map for a session with no claims).
func (s *ClaimStore) LoadSession(qrSession string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.mem[qrSession]; ok {
		return nil
	}

	cutoff := time.Now().Add(-ClaimTTL).Unix()
	if err := s.db.Where("qr_session = ? AND updated_at < ?", qrSession, cutoff).
		Delete(&ItemClaim{}).Error; err != nil {
		return fmt.Errorf("expire claims for session %s: %w", qrSession, err)
	}

	var rows []ItemClaim
	if err := s.db.Where("qr_session = ?", qrSession).Find(&rows).Error; err != nil {
		return fmt.Errorf("load claims for session %s: %w", qrSession, err)
	}

	m := make(map[string]string, len(rows))
	for _, row := range rows {
		m[row.ItemID] = row.UserID
	}
	s.mem[qrSession] = m
	return nil
}

// GetSession returns a copy of in-memory claims for a session (itemID -> userID).
func (s *ClaimStore) GetSession(qrSession string) map[string]string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	src := s.mem[qrSession]
	if src == nil {
		return map[string]string{}
	}
	out := make(map[string]string, len(src))
	for k, v := range src {
		out[k] = v
	}
	return out
}

// ValidateSessionItem verifies the QR session exists in the DB and itemID is a
// menuId on that session's current order. Rejects fake session/item pairs so
// unauthenticated WS clients cannot create unbounded claim rows.
func (s *ClaimStore) ValidateSessionItem(qrSession, itemID string) error {
	if qrSession == "" || itemID == "" {
		return fmt.Errorf("qr_session and item_id are required")
	}

	var qr QRSession
	if err := s.db.First(&qr, "id = ?", qrSession).Error; err != nil {
		return fmt.Errorf("unknown qr session")
	}
	if qr.CurrentOrder == nil {
		return fmt.Errorf("qr session has no current order")
	}

	var order Order
	if err := s.db.First(&order, "id = ?", *qr.CurrentOrder).Error; err != nil {
		return fmt.Errorf("current order not found")
	}

	var items []OrderItem
	if err := json.Unmarshal([]byte(order.Items), &items); err != nil {
		return fmt.Errorf("failed to parse order items")
	}
	for _, it := range items {
		if it.MenuID == itemID {
			return nil
		}
	}
	return fmt.Errorf("item_id not in session order")
}

// SetClaim records that userID claims itemID in qrSession.
// Persistence completes under the store lock before memory is updated, so
// concurrent claimers cannot diverge mem vs DB vs broadcast order.
func (s *ClaimStore) SetClaim(qrSession, userID, itemID string) error {
	if qrSession == "" || userID == "" || itemID == "" {
		return fmt.Errorf("qr_session, user_id, and item_id are required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	claim := ItemClaim{
		ID:        uuid.New().String(),
		QRSession: qrSession,
		ItemID:    itemID,
		UserID:    userID,
	}
	err := s.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "qr_session"}, {Name: "item_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"user_id", "updated_at"}),
	}).Create(&claim).Error
	if err != nil {
		return fmt.Errorf("persist claim: %w", err)
	}

	if s.mem[qrSession] == nil {
		s.mem[qrSession] = make(map[string]string)
	}
	s.mem[qrSession][itemID] = userID
	return nil
}

// ClearClaim removes a claim when the owning user deselects the item.
// DB delete runs under the store lock before memory is updated.
func (s *ClaimStore) ClearClaim(qrSession, userID, itemID string) error {
	if qrSession == "" || userID == "" || itemID == "" {
		return fmt.Errorf("qr_session, user_id, and item_id are required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	err := s.db.Where(
		"qr_session = ? AND item_id = ? AND user_id = ?",
		qrSession, itemID, userID,
	).Delete(&ItemClaim{}).Error
	if err != nil {
		return fmt.Errorf("delete claim: %w", err)
	}

	if sessionClaims, ok := s.mem[qrSession]; ok {
		if owner, exists := sessionClaims[itemID]; exists && owner == userID {
			delete(sessionClaims, itemID)
		}
	}
	return nil
}

// UnloadSession drops the in-memory map for a session (DB rows kept).
func (s *ClaimStore) UnloadSession(qrSession string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.mem, qrSession)
}

// ReloadFromDB clears in-memory state for a session and reloads from the DB.
// Used by tests to prove persistence survives a "restart" of the store.
func (s *ClaimStore) ReloadFromDB(qrSession string) error {
	s.mu.Lock()
	delete(s.mem, qrSession)
	s.mu.Unlock()
	return s.LoadSession(qrSession)
}
