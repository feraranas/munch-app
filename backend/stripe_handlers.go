package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v86"
	"github.com/stripe/stripe-go/v86/webhook"
)

// PaymentIntentCreateRequest is the diner request to start a split payment.
type PaymentIntentCreateRequest struct {
	OrderID string   `json:"order_id" binding:"required"`
	ItemIDs []string `json:"item_ids"`
}

// PaymentIntentCreateResponse is returned to the frontend for Payment Element
// confirmation, or with Mock=true when Stripe keys are unset (dev path).
type PaymentIntentCreateResponse struct {
	ClientSecret string `json:"client_secret,omitempty"`
	PaymentID    string `json:"payment_id"`
	Amount       int64  `json:"amount"` // centavos MXN
	Currency     string `json:"currency"`
	Mock         bool   `json:"mock,omitempty"`
	Message      string `json:"message,omitempty"`
}

func (app *App) stripeClient() *stripe.Client {
	if app.Config == nil || app.Config.StripeSecretKey == "" {
		return nil
	}
	return stripe.NewClient(app.Config.StripeSecretKey)
}

// createPaymentIntent validates selected item_ids against the order DB, inserts
// a pending Payment, and either creates a Stripe PaymentIntent or completes a
// local mock when STRIPE_SECRET_KEY is unset.
func (app *App) createPaymentIntent(c *gin.Context) {
	var req PaymentIntentCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	var order Order
	if err := app.DB.First(&order, "id = ?", req.OrderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Orden no encontrada."})
		return
	}

	itemIDs := uniqueNonEmpty(req.ItemIDs)
	if len(itemIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Selecciona al menos un item para pagar."})
		return
	}

	var items []OrderItem
	if err := json.Unmarshal([]byte(order.Items), &items); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al leer la orden."})
		return
	}

	alreadyPaid, err := completedPaidItemIDs(app.DB, req.OrderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al verificar pagos."})
		return
	}
	if containsAny(alreadyPaid, itemIDs) {
		c.JSON(http.StatusConflict, gin.H{"error": "Uno o más items ya fueron pagados."})
		return
	}

	amountPesos, err := amountForMenuIDs(items, itemIDs)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Item no encontrado en la orden."})
		return
	}
	amountCentavos := pesosToCentavos(amountPesos)

	app.Logger.Info().
		Str("order_id", req.OrderID).
		Float64("amount_pesos", amountPesos).
		Int64("amount_centavos", amountCentavos).
		Msg("Creating payment intent")

	payment := Payment{
		ID:      uuid.New().String(),
		OrderID: req.OrderID,
		Amount:  amountPesos,
		ItemIDs: itemIDs,
		Status:  "pending",
	}
	if err := app.DB.Create(&payment).Error; err != nil {
		app.Logger.Error().Err(err).Msg("Failed to create payment record")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al registrar el pago."})
		return
	}

	// Dev/mock: no Stripe secret → complete immediately (same UX as old Openpay unset).
	if app.Config.StripeSecretKey == "" {
		txID := "mock_" + uuid.New().String()
		if err := app.completePaymentFromItems(&payment, &order, items, alreadyPaid, txID, ""); err != nil {
			app.Logger.Error().Err(err).Msg("Failed to complete mock payment")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al completar el pago de prueba."})
			return
		}
		app.Logger.Warn().
			Str("order_id", req.OrderID).
			Str("payment_id", payment.ID).
			Str("transaction_id", txID).
			Float64("amount", amountPesos).
			Int("items", len(itemIDs)).
			Msg("STRIPE_SECRET_KEY unset; completing mock payment")
		c.JSON(http.StatusOK, PaymentIntentCreateResponse{
			PaymentID: payment.ID,
			Amount:    amountCentavos,
			Currency:  "mxn",
			Mock:      true,
			Message:   "Pago de prueba (Stripe no configurado)",
		})
		return
	}

	sc := app.stripeClient()
	itemMeta := strings.Join(itemIDs, ",")
	params := &stripe.PaymentIntentCreateParams{
		Amount:   stripe.Int64(amountCentavos),
		Currency: stripe.String(string(stripe.CurrencyMXN)),
		AutomaticPaymentMethods: &stripe.PaymentIntentCreateAutomaticPaymentMethodsParams{
			Enabled: stripe.Bool(true),
		},
		Metadata: map[string]string{
			"payment_id": payment.ID,
			"order_id":   req.OrderID,
			"item_ids":   itemMeta,
		},
	}

	pi, err := sc.V1PaymentIntents.Create(context.Background(), params)
	if err != nil {
		app.Logger.Error().Err(err).Str("order_id", req.OrderID).Msg("Stripe PaymentIntent create failed")
		_ = app.markPaymentFailed(&payment, err.Error(), "")
		c.JSON(http.StatusBadGateway, gin.H{"error": "Error al iniciar el pago con Stripe."})
		return
	}

	payment.StripePaymentIntentID = pi.ID
	if raw, jerr := json.Marshal(pi); jerr == nil {
		payment.ProviderResponse = string(raw)
	}
	if err := app.DB.Save(&payment).Error; err != nil {
		app.Logger.Error().Err(err).Msg("Failed to save PaymentIntent id")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar el intento de pago."})
		return
	}

	c.JSON(http.StatusOK, PaymentIntentCreateResponse{
		ClientSecret: pi.ClientSecret,
		PaymentID:    payment.ID,
		Amount:       amountCentavos,
		Currency:     "mxn",
	})
}

// handleStripeWebhook verifies the Stripe signature and completes or fails
// payments on payment_intent.succeeded / payment_intent.payment_failed.
func (app *App) handleStripeWebhook(c *gin.Context) {
	const maxBody = int64(65536)
	payload, err := io.ReadAll(io.LimitReader(c.Request.Body, maxBody))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}
	sig := c.GetHeader("Stripe-Signature")
	if app.Config.StripeWebhookSecret == "" {
		app.Logger.Error().Msg("STRIPE_WEBHOOK_SECRET unset; rejecting webhook")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "webhook not configured"})
		return
	}

	event, err := webhook.ConstructEventWithOptions(payload, sig, app.Config.StripeWebhookSecret, webhook.ConstructEventOptions{
		IgnoreAPIVersionMismatch: true,
	})
	if err != nil {
		app.Logger.Warn().Err(err).Msg("Stripe webhook signature verification failed")
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid signature"})
		return
	}

	switch event.Type {
	case "payment_intent.succeeded":
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(event.Data.Raw, &pi); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payment_intent payload"})
			return
		}
		if err := app.applyPaymentIntentSucceeded(&pi, string(payload)); err != nil {
			app.Logger.Error().Err(err).Str("pi", pi.ID).Msg("Failed to complete payment from webhook")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to complete payment"})
			return
		}
	case "payment_intent.payment_failed":
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(event.Data.Raw, &pi); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payment_intent payload"})
			return
		}
		if err := app.applyPaymentIntentFailed(&pi, string(payload)); err != nil {
			app.Logger.Error().Err(err).Str("pi", pi.ID).Msg("Failed to mark payment failed from webhook")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark payment"})
			return
		}
	default:
		app.Logger.Debug().Str("type", string(event.Type)).Msg("Ignoring Stripe event")
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}

func (app *App) applyPaymentIntentSucceeded(pi *stripe.PaymentIntent, raw string) error {
	payment, err := app.findPaymentForIntent(pi)
	if err != nil {
		return err
	}
	if payment.Status == "completed" {
		return nil
	}

	var order Order
	if err := app.DB.First(&order, "id = ?", payment.OrderID).Error; err != nil {
		return fmt.Errorf("order: %w", err)
	}
	var items []OrderItem
	if err := json.Unmarshal([]byte(order.Items), &items); err != nil {
		return fmt.Errorf("order items: %w", err)
	}
	alreadyPaid, err := completedPaidItemIDs(app.DB, payment.OrderID)
	if err != nil {
		return err
	}
	// Exclude this payment's items from alreadyPaid overlap check — they are not completed yet.
	return app.completePaymentFromItems(payment, &order, items, alreadyPaid, pi.ID, raw)
}

func (app *App) applyPaymentIntentFailed(pi *stripe.PaymentIntent, raw string) error {
	payment, err := app.findPaymentForIntent(pi)
	if err != nil {
		return err
	}
	msg := "Pago fallido"
	if pi.LastPaymentError != nil && pi.LastPaymentError.Msg != "" {
		msg = pi.LastPaymentError.Msg
	}
	return app.markPaymentFailed(payment, msg, raw)
}

func (app *App) findPaymentForIntent(pi *stripe.PaymentIntent) (*Payment, error) {
	var payment Payment
	if pi.ID != "" {
		if err := app.DB.Where("stripe_payment_intent_id = ?", pi.ID).First(&payment).Error; err == nil {
			return &payment, nil
		}
	}
	if pid, ok := pi.Metadata["payment_id"]; ok && pid != "" {
		if err := app.DB.First(&payment, "id = ?", pid).Error; err == nil {
			if payment.StripePaymentIntentID == "" && pi.ID != "" {
				payment.StripePaymentIntentID = pi.ID
			}
			return &payment, nil
		}
	}
	return nil, fmt.Errorf("payment not found for intent %s", pi.ID)
}
