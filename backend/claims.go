package main

import (
	"fmt"
	"sync"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

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
// Safe to call repeatedly; a session already present in memory is left as-is
// (including an empty map for a session with no claims).
func (s *ClaimStore) LoadSession(qrSession string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.mem[qrSession]; ok {
		return nil
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

// SetClaim records that userID claims itemID in qrSession (memory + DB upsert).
func (s *ClaimStore) SetClaim(qrSession, userID, itemID string) error {
	if qrSession == "" || userID == "" || itemID == "" {
		return fmt.Errorf("qr_session, user_id, and item_id are required")
	}

	s.mu.Lock()
	if s.mem[qrSession] == nil {
		s.mem[qrSession] = make(map[string]string)
	}
	s.mem[qrSession][itemID] = userID
	s.mu.Unlock()

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
	return nil
}

// ClearClaim removes a claim when the owning user deselects the item.
func (s *ClaimStore) ClearClaim(qrSession, userID, itemID string) error {
	if qrSession == "" || userID == "" || itemID == "" {
		return fmt.Errorf("qr_session, user_id, and item_id are required")
	}

	s.mu.Lock()
	if sessionClaims, ok := s.mem[qrSession]; ok {
		if owner, exists := sessionClaims[itemID]; exists && owner == userID {
			delete(sessionClaims, itemID)
		}
	}
	s.mu.Unlock()

	err := s.db.Where(
		"qr_session = ? AND item_id = ? AND user_id = ?",
		qrSession, itemID, userID,
	).Delete(&ItemClaim{}).Error
	if err != nil {
		return fmt.Errorf("delete claim: %w", err)
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
