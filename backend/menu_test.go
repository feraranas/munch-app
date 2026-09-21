package main

import (
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupMenuTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := "file:" + t.Name() + "?mode=memory&cache=shared"
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&MenuItem{}); err != nil {
		t.Fatalf("automigrate: %v", err)
	}
	return db
}

func TestSeedMenuItemsThenList(t *testing.T) {
	db := setupMenuTestDB(t)

	if err := seedMenuItems(db); err != nil {
		t.Fatalf("seed: %v", err)
	}

	items, err := listMenuItems(db)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	want := len(defaultMenuItems())
	if len(items) != want {
		t.Fatalf("got %d items, want %d", len(items), want)
	}

	// Idempotent: second seed must not duplicate
	if err := seedMenuItems(db); err != nil {
		t.Fatalf("re-seed: %v", err)
	}
	items, err = listMenuItems(db)
	if err != nil {
		t.Fatalf("list after re-seed: %v", err)
	}
	if len(items) != want {
		t.Fatalf("after re-seed got %d items, want %d", len(items), want)
	}

	pastor, err := getMenuItemByID(db, "tacos_pastor")
	if err != nil {
		t.Fatalf("get tacos_pastor: %v", err)
	}
	if pastor.Price != 12.99 {
		t.Fatalf("seed price=%v, want 12.99", pastor.Price)
	}
	if pastor.Name != "Tacos al Pastor (3)" {
		t.Fatalf("seed name=%q", pastor.Name)
	}
	if len(pastor.Toppings) != 3 {
		t.Fatalf("seed toppings=%d, want 3", len(pastor.Toppings))
	}
}

func TestMenuPriceReflectsStoreNotCodeConstant(t *testing.T) {
	db := setupMenuTestDB(t)
	if err := seedMenuItems(db); err != nil {
		t.Fatalf("seed: %v", err)
	}

	const itemID = "tacos_pastor"
	const newPrice = 99.50

	if err := db.Model(&MenuItem{}).Where("id = ?", itemID).Update("price", newPrice).Error; err != nil {
		t.Fatalf("update price: %v", err)
	}

	got, err := getMenuItemByID(db, itemID)
	if err != nil {
		t.Fatalf("get after update: %v", err)
	}
	if got.Price != newPrice {
		t.Fatalf("price from store=%v, want %v (code constant was 12.99)", got.Price, newPrice)
	}

	// Pricing helper must use store price, not a hardcoded constant
	unit := lineItemUnitPrice(got, []Topping{{Name: "Guacamole", Price: 2.00}})
	wantUnit := newPrice + 2.00
	if unit != wantUnit {
		t.Fatalf("unit price=%v, want %v", unit, wantUnit)
	}

	defaults := defaultMenuItems()
	var codeConstant float64
	for _, d := range defaults {
		if d.ID == itemID {
			codeConstant = d.Price
			break
		}
	}
	if got.Price == codeConstant {
		t.Fatal("store price still matches code constant; update did not take effect")
	}
}

func TestAddMenuItemAffectsListAndPrice(t *testing.T) {
	db := setupMenuTestDB(t)
	if err := seedMenuItems(db); err != nil {
		t.Fatalf("seed: %v", err)
	}

	extra := MenuItem{
		ID:        "tacos_suadero",
		Name:      "Tacos de Suadero (3)",
		Price:     13.50,
		SortOrder: 100,
		Toppings:  []Topping{{Name: "Cebolla", Price: 0.50}},
	}
	if err := db.Create(&extra).Error; err != nil {
		t.Fatalf("create item: %v", err)
	}

	items, err := listMenuItems(db)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	found := false
	for _, it := range items {
		if it.ID == extra.ID {
			found = true
			if it.Price != 13.50 {
				t.Fatalf("listed price=%v, want 13.50", it.Price)
			}
			break
		}
	}
	if !found {
		t.Fatal("added item missing from list")
	}

	got, err := getMenuItemByID(db, extra.ID)
	if err != nil {
		t.Fatalf("get added item: %v", err)
	}
	unit := lineItemUnitPrice(got, got.Toppings)
	if unit != 14.00 {
		t.Fatalf("unit with topping=%v, want 14.00", unit)
	}
}

func floatPtr(v float64) *float64 { return &v }
func boolPtr(v bool) *bool        { return &v }
func stringPtr(v string) *string  { return &v }

func TestCreateUpdateArchiveMenuItem(t *testing.T) {
	db := setupMenuTestDB(t)
	if err := seedMenuItems(db); err != nil {
		t.Fatalf("seed: %v", err)
	}

	created, err := createMenuItem(db, MenuItem{
		Name:     "Tacos de Suadero (3)",
		Price:    13.50,
		Toppings: []Topping{{Name: "Cebolla", Price: 0.50}},
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if created.ID == "" {
		t.Fatal("expected derived id")
	}
	if !created.Active {
		t.Fatal("new item should be active")
	}

	active, err := listActiveMenuItems(db)
	if err != nil {
		t.Fatalf("list active: %v", err)
	}
	found := false
	for _, it := range active {
		if it.ID == created.ID {
			found = true
			if it.Price != 13.50 {
				t.Fatalf("listed price=%v, want 13.50", it.Price)
			}
			break
		}
	}
	if !found {
		t.Fatal("created item missing from active list")
	}

	updated, err := updateMenuItem(db, created.ID, MenuItemUpdate{Price: floatPtr(15.00)})
	if err != nil {
		t.Fatalf("update price: %v", err)
	}
	if updated.Price != 15.00 {
		t.Fatalf("updated price=%v, want 15.00", updated.Price)
	}

	got, err := getMenuItemByID(db, created.ID)
	if err != nil {
		t.Fatalf("get after update: %v", err)
	}
	unit := lineItemUnitPrice(got, nil)
	if unit != 15.00 {
		t.Fatalf("unit price=%v, want 15.00 (store, not create-time 13.50)", unit)
	}

	if err := archiveMenuItem(db, created.ID); err != nil {
		t.Fatalf("archive: %v", err)
	}

	active, err = listActiveMenuItems(db)
	if err != nil {
		t.Fatalf("list after archive: %v", err)
	}
	for _, it := range active {
		if it.ID == created.ID {
			t.Fatal("archived item still in active list")
		}
	}

	if _, err := getMenuItemByID(db, created.ID); err == nil {
		t.Fatal("archived item must not price new POS lines")
	}

	all, err := listAllMenuItems(db)
	if err != nil {
		t.Fatalf("list all: %v", err)
	}
	staffFound := false
	for _, it := range all {
		if it.ID == created.ID {
			staffFound = true
			if it.Active {
				t.Fatal("archived item still active in staff list")
			}
			break
		}
	}
	if !staffFound {
		t.Fatal("archived item missing from staff list")
	}

	// Unarchive via update
	if _, err := updateMenuItem(db, created.ID, MenuItemUpdate{Active: boolPtr(true)}); err != nil {
		t.Fatalf("unarchive: %v", err)
	}
	if _, err := getMenuItemByID(db, created.ID); err != nil {
		t.Fatalf("unarchived item should price POS lines: %v", err)
	}
}

func TestCreateMenuItemRejectsInvalid(t *testing.T) {
	db := setupMenuTestDB(t)

	if _, err := createMenuItem(db, MenuItem{Name: "  ", Price: 1}); err == nil {
		t.Fatal("expected error for empty name")
	}
	if _, err := createMenuItem(db, MenuItem{Name: "Tacos", Price: -1}); err == nil {
		t.Fatal("expected error for negative price")
	}
	if _, err := createMenuItem(db, MenuItem{ID: "Not Valid", Name: "Tacos", Price: 1}); err == nil {
		t.Fatal("expected error for invalid id")
	}
}
