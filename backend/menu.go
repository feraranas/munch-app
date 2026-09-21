package main

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"unicode"

	"gorm.io/gorm"
)

var (
	ErrMenuValidation = errors.New("invalid menu item")
	ErrMenuConflict   = errors.New("menu item already exists")
	ErrMenuNotFound   = errors.New("menu item not found")
)

var menuIDPattern = regexp.MustCompile(`^[a-z0-9]+(?:_[a-z0-9]+)*$`)

// BeforeCreate defaults Active to true. Go's bool zero-value is false, which
// would otherwise insert archived rows for seed/create paths that omit Active.
func (m *MenuItem) BeforeCreate(tx *gorm.DB) error {
	m.Active = true
	return nil
}

// MenuItemUpdate is a partial update. Nil fields are left unchanged.
type MenuItemUpdate struct {
	Name      *string
	Price     *float64
	Toppings  *[]Topping
	Active    *bool
	SortOrder *int
}

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
	return listAllMenuItems(db)
}

func listAllMenuItems(db *gorm.DB) ([]MenuItem, error) {
	var items []MenuItem
	if err := db.Order("sort_order ASC, id ASC").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func listActiveMenuItems(db *gorm.DB) ([]MenuItem, error) {
	var items []MenuItem
	if err := db.Where("active = ?", true).Order("sort_order ASC, id ASC").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func getMenuItemByIDAny(db *gorm.DB, id string) (*MenuItem, error) {
	var item MenuItem
	if err := db.First(&item, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrMenuNotFound
		}
		return nil, err
	}
	return &item, nil
}

// getMenuItemByID returns an active catalog row. Archived items are treated as
// unknown so POS / updateOrder cannot add them to new orders.
func getMenuItemByID(db *gorm.DB, id string) (*MenuItem, error) {
	var item MenuItem
	if err := db.Where("id = ? AND active = ?", id, true).First(&item).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrMenuNotFound
		}
		return nil, err
	}
	return &item, nil
}

func slugifyMenuID(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	var b strings.Builder
	prevUnderscore := false
	for _, r := range s {
		switch {
		case unicode.IsLetter(r) && r < unicode.MaxASCII && unicode.Is(unicode.Latin, r):
			b.WriteRune(unicode.ToLower(r))
			prevUnderscore = false
		case r >= 'a' && r <= 'z' || r >= '0' && r <= '9':
			b.WriteRune(r)
			prevUnderscore = false
		default:
			if !prevUnderscore && b.Len() > 0 {
				b.WriteByte('_')
				prevUnderscore = true
			}
		}
	}
	return strings.Trim(b.String(), "_")
}

func nextSortOrder(db *gorm.DB) int {
	var max int
	_ = db.Model(&MenuItem{}).Select("COALESCE(MAX(sort_order), 0)").Scan(&max)
	return max + 1
}

func idExists(db *gorm.DB, id string) bool {
	var n int64
	db.Model(&MenuItem{}).Where("id = ?", id).Count(&n)
	return n > 0
}

func uniqueDerivedID(db *gorm.DB, base string) string {
	id := base
	for i := 2; idExists(db, id); i++ {
		id = fmt.Sprintf("%s_%d", base, i)
	}
	return id
}

func createMenuItem(db *gorm.DB, item MenuItem) (*MenuItem, error) {
	item.Name = strings.TrimSpace(item.Name)
	if item.Name == "" {
		return nil, fmt.Errorf("%w: name is required", ErrMenuValidation)
	}
	if item.Price < 0 {
		return nil, fmt.Errorf("%w: price must be >= 0", ErrMenuValidation)
	}

	providedID := strings.TrimSpace(item.ID)
	if providedID != "" {
		if !menuIDPattern.MatchString(providedID) {
			return nil, fmt.Errorf("%w: id must be lowercase slug (e.g. tacos_pastor)", ErrMenuValidation)
		}
		if idExists(db, providedID) {
			return nil, fmt.Errorf("%w: %s", ErrMenuConflict, providedID)
		}
		item.ID = providedID
	} else {
		base := slugifyMenuID(item.Name)
		if base == "" {
			return nil, fmt.Errorf("%w: could not derive id from name", ErrMenuValidation)
		}
		item.ID = uniqueDerivedID(db, base)
	}

	if item.SortOrder == 0 {
		item.SortOrder = nextSortOrder(db)
	}
	item.Active = true
	if item.Toppings == nil {
		item.Toppings = []Topping{}
	}

	if err := db.Create(&item).Error; err != nil {
		return nil, fmt.Errorf("create menu item: %w", err)
	}
	return &item, nil
}

func updateMenuItem(db *gorm.DB, id string, patch MenuItemUpdate) (*MenuItem, error) {
	item, err := getMenuItemByIDAny(db, id)
	if err != nil {
		return nil, err
	}
	if patch.Name == nil && patch.Price == nil && patch.Toppings == nil && patch.Active == nil && patch.SortOrder == nil {
		return nil, fmt.Errorf("%w: no fields to update", ErrMenuValidation)
	}
	if patch.Name != nil {
		name := strings.TrimSpace(*patch.Name)
		if name == "" {
			return nil, fmt.Errorf("%w: name is required", ErrMenuValidation)
		}
		item.Name = name
	}
	if patch.Price != nil {
		if *patch.Price < 0 {
			return nil, fmt.Errorf("%w: price must be >= 0", ErrMenuValidation)
		}
		item.Price = *patch.Price
	}
	if patch.Toppings != nil {
		item.Toppings = *patch.Toppings
	}
	if patch.Active != nil {
		item.Active = *patch.Active
	}
	if patch.SortOrder != nil {
		item.SortOrder = *patch.SortOrder
	}
	if err := db.Save(item).Error; err != nil {
		return nil, fmt.Errorf("update menu item: %w", err)
	}
	return item, nil
}

func archiveMenuItem(db *gorm.DB, id string) error {
	item, err := getMenuItemByIDAny(db, id)
	if err != nil {
		return err
	}
	if !item.Active {
		return nil
	}
	item.Active = false
	if err := db.Save(item).Error; err != nil {
		return fmt.Errorf("archive menu item: %w", err)
	}
	return nil
}

// lineItemUnitPrice is base menu price plus selected topping prices (one unit).
func lineItemUnitPrice(menuItem *MenuItem, toppings []Topping) float64 {
	price := menuItem.Price
	for _, topping := range toppings {
		price += topping.Price
	}
	return price
}
