package main

import (
	"fmt"
	"math"

	"gorm.io/gorm"
)

func uniqueNonEmpty(ids []string) []string {
	seen := make(map[string]struct{}, len(ids))
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}

func amountForMenuIDs(items []OrderItem, ids []string) (float64, error) {
	want := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		want[id] = struct{}{}
	}
	var sum float64
	found := 0
	for i := range items {
		if _, ok := want[items[i].MenuID]; !ok {
			continue
		}
		qty := items[i].Qty
		if qty <= 0 {
			qty = 1
		}
		sum += lineItemUnitPrice(&MenuItem{Price: items[i].Price}, items[i].Toppings) * float64(qty)
		found++
	}
	if found != len(ids) {
		return 0, fmt.Errorf("unknown item on order")
	}
	return sum, nil
}

func completedPaidItemIDs(db *gorm.DB, orderID string) ([]string, error) {
	var payments []Payment
	if err := db.Where("order_id = ? AND status = ?", orderID, "completed").Find(&payments).Error; err != nil {
		return nil, err
	}
	var ids []string
	for _, p := range payments {
		ids = append(ids, p.ItemIDs...)
	}
	return uniqueNonEmpty(ids), nil
}

func containsAny(have []string, want []string) bool {
	set := make(map[string]struct{}, len(have))
	for _, id := range have {
		set[id] = struct{}{}
	}
	for _, id := range want {
		if _, ok := set[id]; ok {
			return true
		}
	}
	return false
}

func allOrderItemsPaid(items []OrderItem, paid []string) bool {
	if len(items) == 0 {
		return false
	}
	set := make(map[string]struct{}, len(paid))
	for _, id := range paid {
		set[id] = struct{}{}
	}
	for _, it := range items {
		if _, ok := set[it.MenuID]; !ok {
			return false
		}
	}
	return true
}

// pesosToCentavos converts a peso amount to Stripe integer centavos (MXN).
func pesosToCentavos(pesos float64) int64 {
	return int64(math.Round(pesos * 100))
}

// completePaymentFromItems marks a pending payment completed and, when every
// order line is covered by completed payments, sets the order status to paid.
// Idempotent if the payment is already completed.
func (app *App) completePaymentFromItems(payment *Payment, order *Order, items []OrderItem, alreadyPaid []string, txID string, providerJSON string) error {
	if payment.Status == "completed" {
		return nil
	}
	payment.Status = "completed"
	if txID != "" {
		payment.TransactionID = txID
	}
	if providerJSON != "" {
		payment.ProviderResponse = providerJSON
	}
	if err := app.DB.Save(payment).Error; err != nil {
		return err
	}
	paidNow := append(append([]string{}, alreadyPaid...), payment.ItemIDs...)
	if allOrderItemsPaid(items, paidNow) {
		if err := app.DB.Model(order).Update("status", "paid").Error; err != nil {
			return err
		}
	}
	return nil
}

// markPaymentFailed sets a payment to failed (idempotent if already terminal).
func (app *App) markPaymentFailed(payment *Payment, errMsg string, providerJSON string) error {
	if payment.Status == "completed" || payment.Status == "failed" {
		return nil
	}
	payment.Status = "failed"
	payment.ErrorMessage = errMsg
	if providerJSON != "" {
		payment.ProviderResponse = providerJSON
	}
	return app.DB.Save(payment).Error
}
