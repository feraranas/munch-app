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
	QRID          string         `json:"qrId" binding:"required"` // QR Session ID
	SelectedItems []SelectedItem `json:"selectedItems"`           // Array of selected items with quantities
}

type SelectedItem struct {
	ID       string    `json:"id"`                 // item ID
	MenuID   string    `json:"menuId"`             // Specific item ID from selection
	Qty      int       `json:"qty"`                // Quantity
	Toppings []Topping `json:"toppings,omitempty"` // Selected toppings
}

type Topping struct {
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}

type OrderItem struct {
	ID       string    `json:"id"`
	MenuID   string    `json:"menuId"`
	Name     string    `json:"name"`
	Price    float64   `json:"price"`
	Qty      int       `json:"qty"`
	Toppings []Topping `json:"toppings,omitempty"`
}

type MenuItem struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Price    float64   `json:"price"`
	Toppings []Topping `json:"toppings,omitempty"`
}

// Available menu items for the restaurant
var availableMenuItems = []MenuItem{
	{
		ID:    "tacos_pastor",
		Name:  "Tacos al Pastor (3)",
		Price: 12.99,
		Toppings: []Topping{
			{Name: "Extra Piña", Price: 1.50},
			{Name: "Guacamole", Price: 2.00},
			{Name: "Crema", Price: 0.75},
		},
	},
	{ID: "enchiladas_verdes", Name: "Enchiladas Verdes", Price: 14.99},
	{
		ID:    "tacos_carnitas",
		Name:  "Tacos de Carnitas (3)",
		Price: 11.99,
		Toppings: []Topping{
			{Name: "Guacamole", Price: 2.00},
			{Name: "Crema", Price: 0.75},
			{Name: "Queso Extra", Price: 1.25},
		},
	},
	{
		ID:    "burrito_pollo",
		Name:  "Burrito de Pollo",
		Price: 13.99,
		Toppings: []Topping{
			{Name: "Guacamole", Price: 2.00},
			{Name: "Queso Extra", Price: 1.25},
			{Name: "Jalapeños", Price: 0.50},
		},
	},
	{
		ID:    "quesadilla_queso",
		Name:  "Quesadilla de Queso",
		Price: 9.99,
		Toppings: []Topping{
			{Name: "Hongos", Price: 1.50},
			{Name: "Rajas", Price: 1.00},
			{Name: "Queso Extra", Price: 1.25},
		},
	},
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
	checkURL := app.Config.GetCheckURL(qrID)

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

// Get all QR sessions for admin dashboard
func (app *App) getAllQRSessions(c *gin.Context) {
	var sessions []QRSession
	result := app.DB.Find(&sessions)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch QR sessions"})
		return
	}

	// Build response with order details for each session
	var response []map[string]interface{}
	for _, session := range sessions {
		sessionData := map[string]interface{}{
			"id":           session.ID,
			"table_number": session.TableNumber,
			"created_at":   session.CreatedAt,
			"updated_at":   session.UpdatedAt,
			"has_order":    session.CurrentOrder != nil,
		}

		// If there's a current order, fetch its details
		if session.CurrentOrder != nil {
			var order Order
			orderResult := app.DB.First(&order, "id = ?", *session.CurrentOrder)
			if orderResult.Error == nil {
				// Parse items from JSON string
				var items []OrderItem
				if err := json.Unmarshal([]byte(order.Items), &items); err == nil {
					sessionData["order"] = map[string]interface{}{
						"id":         order.ID,
						"items":      items,
						"total":      order.Total,
						"status":     order.Status,
						"created_at": order.CreatedAt,
					}
				}
			}
		}

		response = append(response, sessionData)
	}

	c.JSON(http.StatusOK, gin.H{"sessions": response})
}

// Update existing order for a QR session
func (app *App) updateOrder(c *gin.Context) {
	var req MenuSelectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate the QR session exists
	var qrSession QRSession
	result := app.DB.First(&qrSession, "id = ?", req.QRID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "QR session not found"})
		return
	}

	// Check if there's an existing order
	if qrSession.CurrentOrder == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No existing order to update"})
		return
	}

	// Get the existing order
	var existingOrder Order
	result = app.DB.First(&existingOrder, "id = ?", *qrSession.CurrentOrder)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Existing order not found"})
		return
	}

	// Process selected items into order items
	var orderItems []OrderItem
	var total float64

	for _, selectedItem := range req.SelectedItems {
		// Find the menu item
		for _, menuItem := range availableMenuItems {
			if menuItem.ID == selectedItem.ID {
				if selectedItem.Qty <= 0 {
					continue // Skip items with zero or negative quantity
				}

				// Calculate item price including toppings
				itemPrice := menuItem.Price
				for _, topping := range selectedItem.Toppings {
					itemPrice += topping.Price
				}

				orderItem := OrderItem{
					ID:       menuItem.ID,
					MenuID:   selectedItem.MenuID,
					Name:     menuItem.Name,
					Price:    menuItem.Price,
					Qty:      selectedItem.Qty,
					Toppings: selectedItem.Toppings,
				}
				orderItems = append(orderItems, orderItem)
				total += itemPrice

				break
			}
		}
	}

	if len(orderItems) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid items selected"})
		return
	}

	// Update the existing order
	itemsJSON, err := json.Marshal(orderItems)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal items"})
		return
	}

	existingOrder.Items = string(itemsJSON)
	existingOrder.Total = total

	if err := app.DB.Save(&existingOrder).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order"})
		return
	}

	// Parse items back for response
	var responseItems []OrderItem
	if err := json.Unmarshal([]byte(existingOrder.Items), &responseItems); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse updated items"})
		return
	}

	response := map[string]interface{}{
		"id":         existingOrder.ID,
		"qr_session": existingOrder.QRSession,
		"items":      responseItems,
		"total":      existingOrder.Total,
		"status":     existingOrder.Status,
		"created_at": existingOrder.CreatedAt,
		"updated":    true,
	}

	c.JSON(http.StatusOK, response)
}

// Creates order from waitstaff menu selection and links to QR session
func (app *App) POSOrder(c *gin.Context) {
	var req MenuSelectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Debug: Log what we received
	fmt.Printf("🔍 DEBUG POSOrder: Received %d selectedItems\n", len(req.SelectedItems))
	for i, item := range req.SelectedItems {
		fmt.Printf("🔍 DEBUG POSOrder: Item %d - ID: %s, MenuID: %s, Qty: %d\n", i, item.ID, item.MenuID, item.Qty)
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

	for _, selectedItem := range req.SelectedItems {
		// Find the menu item
		for _, menuItem := range availableMenuItems {
			if menuItem.ID == selectedItem.ID {
				if selectedItem.Qty <= 0 {
					continue // Skip items with invalid quantity
				}

				// Validate MenuID exists - critical for data integrity
				if selectedItem.MenuID == "" {
					fmt.Printf("🚨 CRITICAL: SelectedItem missing MenuID - ID: %s, Qty: %d\n", selectedItem.ID, selectedItem.Qty)
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid item: missing unique identifier"})
					return
				}

				// Calculate item price including toppings
				itemPrice := menuItem.Price
				for _, topping := range selectedItem.Toppings {
					itemPrice += topping.Price
				}

				orderItem := OrderItem{
					ID:       menuItem.ID,
					MenuID:   selectedItem.MenuID,
					Name:     menuItem.Name,
					Price:    menuItem.Price,
					Qty:      selectedItem.Qty,
					Toppings: selectedItem.Toppings,
				}
				fmt.Printf("🔍 DEBUG POSOrder: Created OrderItem - ID: %s, MenuID: %s, Name: %s, Toppings: %d\n", orderItem.ID, orderItem.MenuID, orderItem.Name, len(orderItem.Toppings))
				orderItems = append(orderItems, orderItem)
				total += itemPrice * float64(selectedItem.Qty)

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
