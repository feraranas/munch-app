package main

// StaffUser represents a staff member with authentication credentials
type StaffUser struct {
	ID           string `json:"id" gorm:"primaryKey"`
	Username     string `json:"username" gorm:"uniqueIndex;not null"`
	PasswordHash string `json:"-" gorm:"not null"` // Never expose password hash in JSON
	Role         string `json:"role" gorm:"not null;default:'staff'"`
	CreatedAt    int64  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    int64  `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName specifies the table name for StaffUser
func (StaffUser) TableName() string {
	return "users"
}

// QRSession represents a QR code session for a table
type QRSession struct {
	ID           string  `json:"id" gorm:"primaryKey"`
	QRImageData  string  `json:"qr_image_data" gorm:"type:text"`
	CurrentOrder *string `json:"current_order,omitempty"`
	TableNumber  *string `json:"table_number,omitempty"`
	CreatedAt    int64   `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    int64   `json:"updated_at" gorm:"autoUpdateTime"`
}

// Order represents a customer order
type Order struct {
	ID        string  `json:"id" gorm:"primaryKey"`
	QRSession string  `json:"qr_session"`
	Items     string  `json:"items" gorm:"type:text"`
	Total     float64 `json:"total"`
	Status    string  `json:"status"`
	CreatedAt int64   `json:"created_at" gorm:"autoCreateTime"`
}

// Payment represents a payment attempt for an order
type Payment struct {
	ID              string  `json:"id" gorm:"primaryKey"`
	OrderID         string  `json:"order_id" gorm:"index;not null"`
	TransactionID   string  `json:"transaction_id"`
	Amount          float64 `json:"amount"`
	Status          string  `json:"status"` // "pending", "completed", "failed"
	ErrorMessage    string  `json:"error_message,omitempty"`
	OpenpayResponse string  `json:"-" gorm:"type:text"`
	CreatedAt       int64   `json:"created_at" gorm:"autoCreateTime"`
}

// ItemClaim is a durable diner claim of a menu line item within a QR session.
// Unique on (qr_session, item_id) so one item has at most one claimer per session.
type ItemClaim struct {
	ID        string `json:"id" gorm:"primaryKey"`
	QRSession string `json:"qr_session" gorm:"uniqueIndex:idx_claim_session_item;not null"`
	ItemID    string `json:"item_id" gorm:"uniqueIndex:idx_claim_session_item;not null"`
	UserID    string `json:"user_id" gorm:"index;not null"`
	CreatedAt int64  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt int64  `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName specifies the table name for ItemClaim
func (ItemClaim) TableName() string {
	return "item_claims"
}

// Topping is an optional add-on priced on top of a menu item.
type Topping struct {
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}

// MenuItem is a catalog entry stored in menu_items (not hardcoded in handlers).
// JSON tags keep GET /api/menu/items compatible with the frontend MenuItem shape.
type MenuItem struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"not null"`
	Price     float64   `json:"price" gorm:"not null"`
	Toppings  []Topping `json:"toppings,omitempty" gorm:"serializer:json"`
	SortOrder int       `json:"-" gorm:"not null;default:0"`
	CreatedAt int64     `json:"-" gorm:"autoCreateTime"`
	UpdatedAt int64     `json:"-" gorm:"autoUpdateTime"`
}

// TableName specifies the table name for MenuItem
func (MenuItem) TableName() string {
	return "menu_items"
}
