package main

import (
	"testing"

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
	if err := db.AutoMigrate(&ItemClaim{}); err != nil {
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
