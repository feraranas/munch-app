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

type QRCreateRequest struct {
	TableNumber string `json:"tableNumber,omitempty"` // Optional table identifier
}

type QRResponse struct {
	QRCodeURL   string `json:"qrCodeUrl"`
	QRID        string `json:"qrId"`
	CheckURL    string `json:"checkUrl"`
	TableNumber string `json:"tableNumber,omitempty"`
}

type CreateOrderRequest struct {
	Items []OrderItem `json:"items"`
	Total float64     `json:"total"`
}

type MenuSelectionRequest struct {
	QRID          string   `json:"qrId" binding:"required"` // QR Session ID
	SelectedItems []string `json:"selectedItems"`           // Array of menu item IDs
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

func (app *App) createQRSession(c *gin.Context) {
	var req QRCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate unique QR session ID
	qrID := uuid.New().String()

	// Create the check URL using QR-ID
	checkURL := fmt.Sprintf("http://localhost:3000/check/%s", qrID)

	// Generate QR code
	qrCode, err := qrcode.Encode(checkURL, qrcode.Medium, 256)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate QR code"})
		return
	}

	// Convert to base64 data URL
	qrDataURL := fmt.Sprintf("data:image/png;base64,%s", base64.StdEncoding.EncodeToString(qrCode))

	// Create QR session in database
	qrSession := QRSession{
		ID:          qrID,
		QRImageData: qrDataURL,
		TableNumber: &req.TableNumber,
	}

	if err := app.DB.Create(&qrSession).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create QR session"})
		return
	}

	response := QRResponse{
		QRCodeURL:   qrDataURL,
		QRID:        qrID,
		CheckURL:    checkURL,
		TableNumber: req.TableNumber,
	}

	c.JSON(http.StatusCreated, response)
}

func (app *App) getOrderByQR(c *gin.Context) {
	qrID := c.Param("qrId")

	// First, get the QR session
	var qrSession QRSession
	result := app.DB.First(&qrSession, "id = ?", qrID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "QR session not found"})
		return
	}

	// If no current order, return empty state
	if qrSession.CurrentOrder == nil {
		response := map[string]interface{}{
			"qr_id":        qrSession.ID,
			"table_number": qrSession.TableNumber,
			"has_order":    false,
			"message":      "No active order for this QR code",
		}
		c.JSON(http.StatusOK, response)
		return
	}

	// Get the current order
	var order Order
	result = app.DB.First(&order, "id = ?", *qrSession.CurrentOrder)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Current order not found"})
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
		"qr_id":        qrSession.ID,
		"table_number": qrSession.TableNumber,
		"has_order":    true,
		"order": map[string]interface{}{
			"id":         order.ID,
			"items":      items,
			"total":      order.Total,
			"status":     order.Status,
			"created_at": order.CreatedAt,
		},
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

// POS Mock API endpoint - creates order from waitstaff menu selection and links to QR session
func (app *App) mockPOSOrder(c *gin.Context) {
	var req MenuSelectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// First, verify the QR session exists
	var qrSession QRSession
	result := app.DB.First(&qrSession, "id = ?", req.QRID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "QR session not found"})
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

	// If no items selected, return error
	if len(orderItems) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No menu items selected"})
		return
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
		ID:        orderID,
		QRSession: req.QRID,
		Items:     string(itemsJSON),
		Total:     total,
		Status:    "open",
	}

	if err := app.DB.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	// Update QR session to point to this order
	qrSession.CurrentOrder = &orderID
	if err := app.DB.Save(&qrSession).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update QR session"})
		return
	}

	// Return the created order with items parsed back
	var items []OrderItem
	json.Unmarshal([]byte(order.Items), &items)

	response := map[string]interface{}{
		"id":         order.ID,
		"qr_id":      req.QRID,
		"items":      items,
		"total":      order.Total,
		"status":     order.Status,
		"created_at": order.CreatedAt,
	}

	c.JSON(http.StatusCreated, response)
}
