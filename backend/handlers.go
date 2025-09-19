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

type MenuSelectionRequest struct {
	SelectedItems []string `json:"selectedItems"` // Array of menu item IDs
}

type OrderItem struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
	Qty   int     `json:"qty"`
}

type MenuItem struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}

// Available menu items for the restaurant
var availableMenuItems = []MenuItem{
	{ID: "tacos_pastor", Name: "Tacos al Pastor (3)", Price: 12.99},
	{ID: "enchiladas_verdes", Name: "Enchiladas Verdes", Price: 14.99},
	{ID: "tacos_carnitas", Name: "Tacos de Carnitas (3)", Price: 11.99},
	{ID: "burrito_pollo", Name: "Burrito de Pollo", Price: 13.99},
	{ID: "quesadilla_queso", Name: "Quesadilla de Queso", Price: 9.99},
	{ID: "cerveza_corona", Name: "Cerveza Corona", Price: 4.50},
	{ID: "cerveza_modelo", Name: "Cerveza Modelo", Price: 4.50},
	{ID: "agua_horchata", Name: "Agua de Horchata", Price: 3.99},
	{ID: "agua_jamaica", Name: "Agua de Jamaica", Price: 3.99},
	{ID: "flan_napolitano", Name: "Flan Napolitano", Price: 6.99},
	{ID: "tres_leches", Name: "Tres Leches", Price: 7.99},
	{ID: "churros", Name: "Churros (6)", Price: 5.99},
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

// Get available menu items for waitstaff
func (app *App) getMenuItems(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"items": availableMenuItems,
	})
}

// POS Mock API endpoint - creates order from waitstaff menu selection
func (app *App) mockPOSOrder(c *gin.Context) {
	var req MenuSelectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert selected menu items to order items
	var orderItems []OrderItem
	var total float64

	for _, selectedID := range req.SelectedItems {
		// Find the menu item
		for _, menuItem := range availableMenuItems {
			if menuItem.ID == selectedID {
				orderItem := OrderItem{
					ID:    menuItem.ID,
					Name:  menuItem.Name,
					Price: menuItem.Price,
					Qty:   1, // Default quantity to 1
				}
				orderItems = append(orderItems, orderItem)
				total += menuItem.Price
				break
			}
		}
	}

	// If no items selected, create a default order for demo purposes
	if len(orderItems) == 0 {
		orderItems = []OrderItem{
			{ID: "tacos_pastor", Name: "Tacos al Pastor (3)", Price: 12.99, Qty: 1},
			{ID: "enchiladas_verdes", Name: "Enchiladas Verdes", Price: 14.99, Qty: 1},
			{ID: "cerveza_corona", Name: "Cerveza Corona", Price: 4.50, Qty: 2},
		}
		total = 36.98
	}

	// Generate unique order ID
	orderID := uuid.New().String()

	// Marshal items to JSON string
	itemsJSON, err := json.Marshal(orderItems)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal items"})
		return
	}

	order := Order{
		ID:     orderID,
		Items:  string(itemsJSON),
		Total:  total,
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
