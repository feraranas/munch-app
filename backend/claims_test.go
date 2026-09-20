package main

import (
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupClaimTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	// Unique in-memory DB per test (avoid shared-cache cross-test pollution)
	dsn := "file:" + t.Name() + "?mode=memory&cache=shared"
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&ItemClaim{}, &QRSession{}, &Order{}); err != nil {
		t.Fatalf("automigrate: %v", err)
	}
	return db
}

func TestClaimStoreRoundTrip(t *testing.T) {
	db := setupClaimTestDB(t)
	store := NewClaimStore(db)

	session := "qr-session-1"
	userA := "user-aaa"
	userB := "user-bbb"
	item1 := "menu_item_1"
	item2 := "menu_item_2"

	if err := store.SetClaim(session, userA, item1); err != nil {
		t.Fatalf("SetClaim item1: %v", err)
	}
	if err := store.SetClaim(session, userB, item2); err != nil {
		t.Fatalf("SetClaim item2: %v", err)
	}

	got := store.GetSession(session)
	if got[item1] != userA {
		t.Fatalf("expected %s claimed by %s, got %q", item1, userA, got[item1])
	}
	if got[item2] != userB {
		t.Fatalf("expected %s claimed by %s, got %q", item2, userB, got[item2])
	}

	// Simulate backend restart: new store, reload from DB
	store2 := NewClaimStore(db)
	if err := store2.LoadSession(session); err != nil {
		t.Fatalf("LoadSession after restart: %v", err)
	}
	restored := store2.GetSession(session)
	if restored[item1] != userA || restored[item2] != userB {
		t.Fatalf("claims not restored after restart: %+v", restored)
	}
}

func TestClaimStoreClearAndReload(t *testing.T) {
	db := setupClaimTestDB(t)
	store := NewClaimStore(db)

	session := "qr-session-2"
	user := "user-ccc"
	item := "menu_item_9"

	if err := store.SetClaim(session, user, item); err != nil {
		t.Fatalf("SetClaim: %v", err)
	}
	if err := store.ClearClaim(session, user, item); err != nil {
		t.Fatalf("ClearClaim: %v", err)
	}

	if err := store.ReloadFromDB(session); err != nil {
		t.Fatalf("ReloadFromDB: %v", err)
	}
	got := store.GetSession(session)
	if _, exists := got[item]; exists {
		t.Fatalf("expected claim cleared after reload, got %+v", got)
	}
}

func TestClaimStoreSessionScoping(t *testing.T) {
	db := setupClaimTestDB(t)
	store := NewClaimStore(db)

	sessionA := "session-a"
	sessionB := "session-b"
	user := "user-ddd"
	item := "shared-menu-id"

	if err := store.SetClaim(sessionA, user, item); err != nil {
		t.Fatalf("SetClaim A: %v", err)
	}
	if err := store.SetClaim(sessionB, "other-user", item); err != nil {
		t.Fatalf("SetClaim B: %v", err)
	}

	store2 := NewClaimStore(db)
	if err := store2.LoadSession(sessionA); err != nil {
		t.Fatalf("LoadSession A: %v", err)
	}
	if err := store2.LoadSession(sessionB); err != nil {
		t.Fatalf("LoadSession B: %v", err)
	}

	a := store2.GetSession(sessionA)
	b := store2.GetSession(sessionB)
	if a[item] != user {
		t.Fatalf("session A leakage/mismatch: %+v", a)
	}
	if b[item] != "other-user" {
		t.Fatalf("session B leakage/mismatch: %+v", b)
	}
	if a[item] == b[item] {
		t.Fatal("cross-session claim leakage: same user for both sessions")
	}
}

func TestClaimStoreUpsertReplacesClaimer(t *testing.T) {
	db := setupClaimTestDB(t)
	store := NewClaimStore(db)

	session := "qr-session-3"
	item := "menu_item_3"

	if err := store.SetClaim(session, "first", item); err != nil {
		t.Fatalf("first SetClaim: %v", err)
	}
	if err := store.SetClaim(session, "second", item); err != nil {
		t.Fatalf("second SetClaim: %v", err)
	}

	if err := store.ReloadFromDB(session); err != nil {
		t.Fatalf("ReloadFromDB: %v", err)
	}
	got := store.GetSession(session)
	if got[item] != "second" {
		t.Fatalf("expected upsert to second claimer, got %q", got[item])
	}

	var count int64
	if err := db.Model(&ItemClaim{}).Where("qr_session = ? AND item_id = ?", session, item).Count(&count).Error; err != nil {
		t.Fatalf("count: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected 1 row after upsert, got %d", count)
	}
}

func TestClaimStoreExpiryOnLoad(t *testing.T) {
	db := setupClaimTestDB(t)
	store := NewClaimStore(db)

	session := "qr-session-expire"
	itemFresh := "fresh-item"
	itemStale := "stale-item"

	if err := store.SetClaim(session, "user-fresh", itemFresh); err != nil {
		t.Fatalf("SetClaim fresh: %v", err)
	}
	if err := store.SetClaim(session, "user-stale", itemStale); err != nil {
		t.Fatalf("SetClaim stale: %v", err)
	}

	// Age the stale claim past ClaimTTL
	staleCutoff := time.Now().Add(-ClaimTTL - time.Minute).Unix()
	if err := db.Model(&ItemClaim{}).
		Where("qr_session = ? AND item_id = ?", session, itemStale).
		Update("updated_at", staleCutoff).Error; err != nil {
		t.Fatalf("age stale claim: %v", err)
	}

	if err := store.ReloadFromDB(session); err != nil {
		t.Fatalf("ReloadFromDB: %v", err)
	}
	got := store.GetSession(session)
	if _, exists := got[itemStale]; exists {
		t.Fatalf("expected stale claim expired on load, got %+v", got)
	}
	if got[itemFresh] != "user-fresh" {
		t.Fatalf("expected fresh claim retained, got %+v", got)
	}

	var staleCount int64
	if err := db.Model(&ItemClaim{}).
		Where("qr_session = ? AND item_id = ?", session, itemStale).
		Count(&staleCount).Error; err != nil {
		t.Fatalf("count stale: %v", err)
	}
	if staleCount != 0 {
		t.Fatalf("expected stale row deleted from DB, got count=%d", staleCount)
	}
}

func TestClaimStoreMemoryMatchesDBAfterSet(t *testing.T) {
	db := setupClaimTestDB(t)
	store := NewClaimStore(db)

	session := "qr-session-serialize"
	item := "menu_item_ser"

	if err := store.SetClaim(session, "owner-a", item); err != nil {
		t.Fatalf("SetClaim a: %v", err)
	}
	if err := store.SetClaim(session, "owner-b", item); err != nil {
		t.Fatalf("SetClaim b: %v", err)
	}

	mem := store.GetSession(session)
	if mem[item] != "owner-b" {
		t.Fatalf("memory owner=%q, want owner-b", mem[item])
	}

	var row ItemClaim
	if err := db.Where("qr_session = ? AND item_id = ?", session, item).First(&row).Error; err != nil {
		t.Fatalf("load db row: %v", err)
	}
	if row.UserID != "owner-b" {
		t.Fatalf("db owner=%q, want owner-b", row.UserID)
	}
	if mem[item] != row.UserID {
		t.Fatalf("mem/DB diverge: mem=%q db=%q", mem[item], row.UserID)
	}
}

func TestClaimStoreValidateSessionItem(t *testing.T) {
	db := setupClaimTestDB(t)
	store := NewClaimStore(db)

	orderID := "order-val-1"
	sessionID := "qr-val-1"
	orderItems := `[{"id":"tacos_pastor","menuId":"line-1","name":"Tacos","price":12.99,"qty":1}]`
	if err := db.Create(&Order{ID: orderID, QRSession: sessionID, Items: orderItems, Total: 12.99, Status: "open"}).Error; err != nil {
		t.Fatalf("create order: %v", err)
	}
	if err := db.Create(&QRSession{ID: sessionID, CurrentOrder: &orderID}).Error; err != nil {
		t.Fatalf("create qr session: %v", err)
	}

	if err := store.ValidateSessionItem(sessionID, "line-1"); err != nil {
		t.Fatalf("expected valid item: %v", err)
	}
	if err := store.ValidateSessionItem(sessionID, "not-on-order"); err == nil {
		t.Fatal("expected rejection for unknown item")
	}
	if err := store.ValidateSessionItem("missing-session", "line-1"); err == nil {
		t.Fatal("expected rejection for unknown session")
	}
}
