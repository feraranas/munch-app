package main

import (
	"fmt"

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
