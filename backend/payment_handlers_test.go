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
		},
		Logger: zerolog.Nop(),
	}
	app.initRouter()
	return app
}

func TestMockPaymentChargesSelectedItemsNotWholeCheck(t *testing.T) {
	app := setupPaymentHTTPApp(t)

	order := Order{
		ID: uuid.New().String(),
		Items: `[{"id":"tacos_pastor","menuId":"line-1","name":"Tacos","price":12.99,"qty":1},` +
			`{"id":"churros","menuId":"line-2","name":"Churros","price":5.99,"qty":1}]`,
		Total:  18.98,
		Status: "open",
	}
	if err := app.DB.Create(&order).Error; err != nil {
		t.Fatalf("create order: %v", err)
	}

	w := doJSON(t, app, http.MethodPost, "/api/payments/charge", "", map[string]any{
		"token_id": "tok_mock_local",
		"order_id": order.ID,
		"item_ids": []string{"line-1"},
	})
	if w.Code != http.StatusOK {
		t.Fatalf("partial charge status=%d body=%s", w.Code, w.Body.String())
	}

	var resp PaymentChargeResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !resp.Success {
		t.Fatalf("expected success, got %+v", resp)
	}

	var pay Payment
	if err := app.DB.Where("order_id = ? AND status = ?", order.ID, "completed").First(&pay).Error; err != nil {
		t.Fatalf("payment: %v", err)
	}
	if pay.Amount != 12.99 {
		t.Fatalf("charged %v, want 12.99 (selected line, not whole check)", pay.Amount)
	}

	var saved Order
	if err := app.DB.First(&saved, "id = ?", order.ID).Error; err != nil {
		t.Fatalf("reload: %v", err)
	}
	if saved.Status == "paid" {
		t.Fatal("partial payment must not mark the whole order paid")
	}

	again := doJSON(t, app, http.MethodPost, "/api/payments/charge", "", map[string]any{
		"token_id": "tok_mock_local",
		"order_id": order.ID,
		"item_ids": []string{"line-1"},
	})
	if again.Code != http.StatusConflict {
		t.Fatalf("repay same item status=%d, want 409 body=%s", again.Code, again.Body.String())
	}

	rest := doJSON(t, app, http.MethodPost, "/api/payments/charge", "", map[string]any{
		"token_id": "tok_mock_local",
		"order_id": order.ID,
		"item_ids": []string{"line-2"},
	})
	if rest.Code != http.StatusOK {
		t.Fatalf("remaining items status=%d body=%s", rest.Code, rest.Body.String())
	}
	if err := app.DB.First(&saved, "id = ?", order.ID).Error; err != nil {
		t.Fatalf("reload after full pay: %v", err)
	}
	if saved.Status != "paid" {
		t.Fatalf("status=%q after all items paid, want paid", saved.Status)
	}
}

func TestChargeRequiresItemIDs(t *testing.T) {
	app := setupPaymentHTTPApp(t)
	order := Order{ID: uuid.New().String(), Items: `[]`, Total: 0, Status: "open"}
	if err := app.DB.Create(&order).Error; err != nil {
		t.Fatalf("create: %v", err)
	}
	w := doJSON(t, app, http.MethodPost, "/api/payments/charge", "", map[string]any{
		"token_id": "tok_mock_local",
		"order_id": order.ID,
	})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("status=%d, want 400 body=%s", w.Code, w.Body.String())
	}
}
