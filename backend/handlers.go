package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/skip2/go-qrcode"
)

type QRRequest struct {
	OrderID string `json:"orderId" binding:"required"`
}

type QRResponse struct {
	QRCodeURL string `json:"qrCodeUrl"`
	OrderID   string `json:"orderId"`
	CheckURL  string `json:"checkUrl"`
}

type CreateOrderRequest struct {
	Items []OrderItem `json:"items"`
	Total float64     `json:"total"`
}

type OrderItem struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
	Qty   int     `json:"qty"`
}

func (app *App) generateQR(c *gin.Context) {
	var req QRRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// For now, we'll create a static QR code pointing to our check URL
	checkURL := fmt.Sprintf("http://localhost:3000/check/%s", req.OrderID)

	// Generate QR code
	qrCode, err := qrcode.Encode(checkURL, qrcode.Medium, 256)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate QR code"})
		return
	}

	// Convert to base64 data URL
	qrDataURL := fmt.Sprintf("data:image/png;base64,%s", base64.StdEncoding.EncodeToString(qrCode))

	// Create a mock order for demonstration
	mockItems := []OrderItem{
		{ID: "1", Name: "Tacos al Pastor (3)", Price: 12.99, Qty: 1},
		{ID: "2", Name: "Enchiladas Verdes", Price: 14.99, Qty: 1},
		{ID: "3", Name: "Cerveza Corona", Price: 4.50, Qty: 2},
		{ID: "4", Name: "Agua de Horchata", Price: 3.99, Qty: 1},
		{ID: "5", Name: "Flan Napolitano", Price: 6.99, Qty: 1},
	}

	itemsJSON, err := json.Marshal(mockItems)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal items"})
		return
	}

	order := Order{
		ID:     req.OrderID,
		Items:  string(itemsJSON),
		Total:  43.46,
		Status: "open",
	}

	// Upsert the order
	app.DB.Save(&order)

	response := QRResponse{
		QRCodeURL: qrDataURL,
		OrderID:   req.OrderID,
		CheckURL:  checkURL,
	}

	c.JSON(http.StatusOK, response)
}

func (app *App) getOrder(c *gin.Context) {
	orderID := c.Param("id")

	var order Order
	result := app.DB.First(&order, "id = ?", orderID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// Parse items from JSON string
	var items []OrderItem
	if err := json.Unmarshal([]byte(order.Items), &items); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse order items"})
		return
	}

	// Return order with parsed items
	response := map[string]interface{}{
		"id":         order.ID,
		"items":      items,
		"total":      order.Total,
		"status":     order.Status,
		"created_at": order.CreatedAt,
	}

	c.JSON(http.StatusOK, response)
}

func (app *App) createOrder(c *gin.Context) {
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate unique order ID
	orderID := uuid.New().String()

	// Marshal items to JSON string
	itemsJSON, err := json.Marshal(req.Items)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal items"})
		return
	}

	order := Order{
		ID:     orderID,
		Items:  string(itemsJSON),
		Total:  req.Total,
		Status: "open",
	}

	if err := app.DB.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	c.JSON(http.StatusCreated, order)
}

// POS Mock API endpoint - simulates a restaurant POS system
func (app *App) mockPOSOrder(c *gin.Context) {
	// Generate a realistic restaurant order
	mockOrder := CreateOrderRequest{
		Items: []OrderItem{
			{ID: "1", Name: "Tacos al Pastor (3)", Price: 12.99, Qty: 1},
			{ID: "2", Name: "Enchiladas Verdes", Price: 14.99, Qty: 1},
			{ID: "3", Name: "Cerveza Corona", Price: 4.50, Qty: 2},
			{ID: "4", Name: "Agua de Horchata", Price: 3.99, Qty: 1},
			{ID: "5", Name: "Flan Napolitano", Price: 6.99, Qty: 1},
		},
		Total: 43.46, // Calculate total
	}

	// Generate unique order ID
	orderID := uuid.New().String()

	// Marshal items to JSON string
	itemsJSON, err := json.Marshal(mockOrder.Items)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal items"})
		return
	}

	order := Order{
		ID:     orderID,
		Items:  string(itemsJSON),
		Total:  mockOrder.Total,
		Status: "open",
	}

	if err := app.DB.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	// Return the created order with items parsed back
	var items []OrderItem
	json.Unmarshal([]byte(order.Items), &items)

	response := map[string]interface{}{
		"id":         order.ID,
		"items":      items,
		"total":      order.Total,
		"status":     order.Status,
		"created_at": order.CreatedAt,
	}

	c.JSON(http.StatusCreated, response)
}
