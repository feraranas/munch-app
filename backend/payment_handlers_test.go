package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"munch-app-backend/config"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/stripe/stripe-go/v86"
	"github.com/stripe/stripe-go/v86/webhook"
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
			// StripeSecretKey empty → mock path
		},
		Logger: zerolog.Nop(),
	}
	app.initRouter()
	return app
}

func TestMockPaymentIntentChargesSelectedItemsNotWholeCheck(t *testing.T) {
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

	w := doJSON(t, app, http.MethodPost, "/api/payments/intents", "", map[string]any{
		"order_id": order.ID,
		"item_ids": []string{"line-1"},
	})
	if w.Code != http.StatusOK {
		t.Fatalf("partial intent status=%d body=%s", w.Code, w.Body.String())
	}

	var resp PaymentIntentCreateResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !resp.Mock {
		t.Fatalf("expected mock:true without Stripe keys, got %+v", resp)
	}
	if resp.ClientSecret != "" {
		t.Fatalf("mock must not return client_secret")
	}
	if resp.Amount != 1299 {
		t.Fatalf("amount centavos=%d, want 1299", resp.Amount)
	}
	if resp.Currency != "mxn" {
		t.Fatalf("currency=%q, want mxn", resp.Currency)
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

	again := doJSON(t, app, http.MethodPost, "/api/payments/intents", "", map[string]any{
		"order_id": order.ID,
		"item_ids": []string{"line-1"},
	})
	if again.Code != http.StatusConflict {
		t.Fatalf("repay same item status=%d, want 409 body=%s", again.Code, again.Body.String())
	}

	rest := doJSON(t, app, http.MethodPost, "/api/payments/intents", "", map[string]any{
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

func TestIntentRequiresItemIDs(t *testing.T) {
	app := setupPaymentHTTPApp(t)
	order := Order{ID: uuid.New().String(), Items: `[]`, Total: 0, Status: "open"}
	if err := app.DB.Create(&order).Error; err != nil {
		t.Fatalf("create: %v", err)
	}
	w := doJSON(t, app, http.MethodPost, "/api/payments/intents", "", map[string]any{
		"order_id": order.ID,
	})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("status=%d, want 400 body=%s", w.Code, w.Body.String())
	}
}

func TestPesosToCentavos(t *testing.T) {
	if got := pesosToCentavos(12.99); got != 1299 {
		t.Fatalf("got %d", got)
	}
	if got := pesosToCentavos(5.995); got != 600 { // round half away / math.Round
		t.Fatalf("got %d want 600", got)
	}
}

func TestWebhookRejectsBadSignature(t *testing.T) {
	app := setupPaymentHTTPApp(t)
	app.Config.StripeWebhookSecret = "whsec_test_secret"

	req := httptest.NewRequest(http.MethodPost, "/api/payments/stripe/webhook", bytes.NewReader([]byte(`{"id":"evt_1"}`)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Stripe-Signature", "t=1,v1=deadbeef")
	w := httptest.NewRecorder()
	app.Router.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("status=%d, want 400 body=%s", w.Code, w.Body.String())
	}
}

func TestWebhookSuccessCompletesPendingPayment(t *testing.T) {
	app := setupPaymentHTTPApp(t)
	secret := "whsec_test_webhook_secret"
	app.Config.StripeWebhookSecret = secret

	order := Order{
		ID:     uuid.New().String(),
		Items:  `[{"id":"tacos_pastor","menuId":"line-1","name":"Tacos","price":10.00,"qty":1}]`,
		Total:  10,
		Status: "open",
	}
	if err := app.DB.Create(&order).Error; err != nil {
		t.Fatalf("order: %v", err)
	}
	payment := Payment{
		ID:                    uuid.New().String(),
		OrderID:               order.ID,
		Amount:                10,
		ItemIDs:               []string{"line-1"},
		Status:                "pending",
		StripePaymentIntentID: "pi_test_webhook_1",
	}
	if err := app.DB.Create(&payment).Error; err != nil {
		t.Fatalf("payment: %v", err)
	}

	piJSON := []byte(`{
		"id":"pi_test_webhook_1",
		"object":"payment_intent",
		"amount":1000,
		"currency":"mxn",
		"status":"succeeded",
		"metadata":{"payment_id":"` + payment.ID + `","order_id":"` + order.ID + `","item_ids":"line-1"}
	}`)
	eventPayload := []byte(fmt.Sprintf(`{
		"id":"evt_test_1",
		"object":"event",
		"type":"payment_intent.succeeded",
		"data":{"object":%s}
	}`, string(piJSON)))

	signed := webhook.GenerateTestSignedPayload(&webhook.UnsignedPayload{
		Payload:   eventPayload,
		Secret:    secret,
		Timestamp: time.Now(),
		Scheme:    "v1",
	})

	req := httptest.NewRequest(http.MethodPost, "/api/payments/stripe/webhook", bytes.NewReader(signed.Payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Stripe-Signature", signed.Header)
	w := httptest.NewRecorder()
	app.Router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("webhook status=%d body=%s", w.Code, w.Body.String())
	}

	var saved Payment
	if err := app.DB.First(&saved, "id = ?", payment.ID).Error; err != nil {
		t.Fatalf("reload payment: %v", err)
	}
	if saved.Status != "completed" {
		t.Fatalf("status=%q, want completed", saved.Status)
	}
	if saved.TransactionID != "pi_test_webhook_1" {
		t.Fatalf("transaction_id=%q", saved.TransactionID)
	}

	var savedOrder Order
	if err := app.DB.First(&savedOrder, "id = ?", order.ID).Error; err != nil {
		t.Fatalf("reload order: %v", err)
	}
	if savedOrder.Status != "paid" {
		t.Fatalf("order status=%q, want paid", savedOrder.Status)
	}

	// Idempotent replay
	req2 := httptest.NewRequest(http.MethodPost, "/api/payments/stripe/webhook", bytes.NewReader(signed.Payload))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Stripe-Signature", signed.Header)
	w2 := httptest.NewRecorder()
	app.Router.ServeHTTP(w2, req2)
	if w2.Code != http.StatusOK {
		t.Fatalf("replay status=%d body=%s", w2.Code, w2.Body.String())
	}
}

func TestCompletePaymentFromItemsHelper(t *testing.T) {
	app := setupPaymentHTTPApp(t)
	order := Order{
		ID:     uuid.New().String(),
		Items:  `[{"id":"a","menuId":"line-1","name":"A","price":1,"qty":1},{"id":"b","menuId":"line-2","name":"B","price":2,"qty":1}]`,
		Total:  3,
		Status: "open",
	}
	_ = app.DB.Create(&order)
	p1 := Payment{ID: uuid.New().String(), OrderID: order.ID, Amount: 1, ItemIDs: []string{"line-1"}, Status: "pending"}
	_ = app.DB.Create(&p1)
	items := []OrderItem{{MenuID: "line-1"}, {MenuID: "line-2"}}
	if err := app.completePaymentFromItems(&p1, &order, items, nil, "tx1", `{"ok":true}`); err != nil {
		t.Fatal(err)
	}
	var o Order
	_ = app.DB.First(&o, "id = ?", order.ID)
	if o.Status == "paid" {
		t.Fatal("partial must not pay order")
	}
	p2 := Payment{ID: uuid.New().String(), OrderID: order.ID, Amount: 2, ItemIDs: []string{"line-2"}, Status: "pending"}
	_ = app.DB.Create(&p2)
	already, _ := completedPaidItemIDs(app.DB, order.ID)
	if err := app.completePaymentFromItems(&p2, &order, items, already, "tx2", ""); err != nil {
		t.Fatal(err)
	}
	_ = app.DB.First(&o, "id = ?", order.ID)
	if o.Status != "paid" {
		t.Fatalf("want paid, got %q", o.Status)
	}
	// Ensure unused import stripe is referenced if needed — keep compile happy for webhook types
	_ = stripe.APIVersion
}
