package main

import (
	"encoding/json"
	"net/http"
	"testing"

	"munch-app-backend/config"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupPaymentHTTPApp(t *testing.T) *App {
	t.Helper()
	gin.SetMode(gin.TestMode)

	dsn := "file:" + t.Name() + "?mode=memory&cache=shared"
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&Order{}, &Payment{}); err != nil {
		t.Fatalf("automigrate: %v", err)
	}

	app := &App{
		DB: db,
		Config: &config.Config{
			JWTSecret:   "test-jwt-secret-for-payments",
			FrontendURL: "http://localhost:3000",
			// Openpay keys intentionally empty → mock charge path
		},
		Logger: zerolog.Nop(),
	}
	app.initRouter()
	return app
}

func TestMockPaymentWhenOpenpayUnset(t *testing.T) {
	app := setupPaymentHTTPApp(t)

	order := Order{
		ID:     uuid.New().String(),
		Items:  `[{"id":"tacos_pastor","menuId":"line-1","name":"Tacos","price":12.99,"qty":1}]`,
		Total:  12.99,
		Status: "open",
	}
	if err := app.DB.Create(&order).Error; err != nil {
		t.Fatalf("create order: %v", err)
	}

	w := doJSON(t, app, http.MethodPost, "/api/payments/charge", "", map[string]any{
		"token_id":    "tok_mock_local",
		"order_id":    order.ID,
		"description": "test",
	})
	if w.Code != http.StatusOK {
		t.Fatalf("mock charge status=%d body=%s", w.Code, w.Body.String())
	}

	var resp PaymentChargeResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !resp.Success {
		t.Fatalf("expected success, got %+v", resp)
	}
	if resp.TransactionID == "" {
		t.Fatal("expected mock transaction id")
	}

	var saved Order
	if err := app.DB.First(&saved, "id = ?", order.ID).Error; err != nil {
		t.Fatalf("reload order: %v", err)
	}
	if saved.Status != "paid" {
		t.Fatalf("order status=%q, want paid", saved.Status)
	}

	var pay Payment
	if err := app.DB.Where("order_id = ? AND status = ?", order.ID, "completed").First(&pay).Error; err != nil {
		t.Fatalf("completed payment missing: %v", err)
	}
}
