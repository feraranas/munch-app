package main

import (
	"fmt"

	"gorm.io/gorm"
)

// defaultMenuItems is the bootstrap catalog. Used only when menu_items is empty
// (fresh DB / first boot). After seed, prices and names live in the store.
func defaultMenuItems() []MenuItem {
	return []MenuItem{
		{
			ID: "tacos_pastor", Name: "Tacos al Pastor (3)", Price: 12.99, SortOrder: 1,
			Toppings: []Topping{
				{Name: "Extra Piña", Price: 1.50},
				{Name: "Guacamole", Price: 2.00},
				{Name: "Crema", Price: 0.75},
			},
		},
		{ID: "enchiladas_verdes", Name: "Enchiladas Verdes", Price: 14.99, SortOrder: 2},
		{
			ID: "tacos_carnitas", Name: "Tacos de Carnitas (3)", Price: 11.99, SortOrder: 3,
			Toppings: []Topping{
				{Name: "Guacamole", Price: 2.00},
				{Name: "Crema", Price: 0.75},
				{Name: "Queso Extra", Price: 1.25},
			},
		},
		{
			ID: "burrito_pollo", Name: "Burrito de Pollo", Price: 13.99, SortOrder: 4,
			Toppings: []Topping{
				{Name: "Guacamole", Price: 2.00},
				{Name: "Queso Extra", Price: 1.25},
				{Name: "Jalapeños", Price: 0.50},
			},
		},
		{
			ID: "quesadilla_queso", Name: "Quesadilla de Queso", Price: 9.99, SortOrder: 5,
			Toppings: []Topping{
				{Name: "Hongos", Price: 1.50},
				{Name: "Rajas", Price: 1.00},
				{Name: "Queso Extra", Price: 1.25},
			},
		},
		{ID: "cerveza_corona", Name: "Cerveza Corona", Price: 4.50, SortOrder: 6},
		{ID: "cerveza_modelo", Name: "Cerveza Modelo", Price: 4.50, SortOrder: 7},
		{ID: "agua_horchata", Name: "Agua de Horchata", Price: 3.99, SortOrder: 8},
		{ID: "agua_jamaica", Name: "Agua de Jamaica", Price: 3.99, SortOrder: 9},
		{ID: "flan_napolitano", Name: "Flan Napolitano", Price: 6.99, SortOrder: 10},
		{ID: "tres_leches", Name: "Tres Leches", Price: 7.99, SortOrder: 11},
		{ID: "churros", Name: "Churros (6)", Price: 5.99, SortOrder: 12},
	}
}

// seedMenuItems inserts the default catalog when the table is empty.
// Idempotent: existing rows are left untouched so ops can change prices without a redeploy.
func seedMenuItems(db *gorm.DB) error {
	var count int64
	if err := db.Model(&MenuItem{}).Count(&count).Error; err != nil {
		return fmt.Errorf("count menu items: %w", err)
	}
	if count > 0 {
		return nil
	}
	items := defaultMenuItems()
	if err := db.Create(&items).Error; err != nil {
		return fmt.Errorf("seed menu items: %w", err)
	}
	return nil
}

func listMenuItems(db *gorm.DB) ([]MenuItem, error) {
	var items []MenuItem
	if err := db.Order("sort_order ASC, id ASC").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func getMenuItemByID(db *gorm.DB, id string) (*MenuItem, error) {
	var item MenuItem
	if err := db.First(&item, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

// lineItemUnitPrice is base menu price plus selected topping prices (one unit).
func lineItemUnitPrice(menuItem *MenuItem, toppings []Topping) float64 {
	price := menuItem.Price
	for _, topping := range toppings {
		price += topping.Price
	}
	return price
}
