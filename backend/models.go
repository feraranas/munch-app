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
