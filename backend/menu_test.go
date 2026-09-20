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
