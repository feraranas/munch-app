package main

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
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

type OrderItem struct {
	ID       string    `json:"id"`
	MenuID   string    `json:"menuId"`
	Name     string    `json:"name"`
	Price    float64   `json:"price"`
	Qty      int       `json:"qty"`
	Toppings []Topping `json:"toppings,omitempty"`
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

	paidIDs, err := completedPaidItemIDs(app.DB, order.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load payments"})
		return
	}

	// Return order with parsed items
	response := map[string]interface{}{
		"qr_id":         qrSession.ID,
		"table_number":  qrSession.TableNumber,
		"has_order":     true,
		"paid_item_ids": paidIDs,
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

type publicMenuItem struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Price    float64   `json:"price"`
	Toppings []Topping `json:"toppings,omitempty"`
}

func toPublicMenuItems(items []MenuItem) []publicMenuItem {
	out := make([]publicMenuItem, 0, len(items))
	for _, it := range items {
		out = append(out, publicMenuItem{
			ID:       it.ID,
			Name:     it.Name,
			Price:    it.Price,
			Toppings: it.Toppings,
		})
	}
	return out
}

func writeMenuError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrMenuValidation):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, ErrMenuConflict):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, ErrMenuNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update menu catalog"})
	}
}

type createMenuItemRequest struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Price    float64   `json:"price"`
	Toppings []Topping `json:"toppings"`
}

type updateMenuItemRequest struct {
	Name     *string    `json:"name"`
	Price    *float64   `json:"price"`
	Toppings *[]Topping `json:"toppings"`
	Active   *bool      `json:"active"`
}

// Get available menu items for diners/POS (active rows only).
func (app *App) getMenuItems(c *gin.Context) {
	items, err := listActiveMenuItems(app.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch menu items"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"items": toPublicMenuItems(items),
	})
}

func (app *App) getAdminMenuItems(c *gin.Context) {
	items, err := listAllMenuItems(app.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch menu items"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (app *App) createMenuItemHandler(c *gin.Context) {
	var req createMenuItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}
	item, err := createMenuItem(app.DB, MenuItem{
		ID:       req.ID,
		Name:     req.Name,
		Price:    req.Price,
		Toppings: req.Toppings,
	})
	if err != nil {
		writeMenuError(c, err)
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (app *App) updateMenuItemHandler(c *gin.Context) {
	id := c.Param("id")
	var req updateMenuItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}
	item, err := updateMenuItem(app.DB, id, MenuItemUpdate{
		Name:     req.Name,
		Price:    req.Price,
		Toppings: req.Toppings,
		Active:   req.Active,
	})
	if err != nil {
		writeMenuError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (app *App) archiveMenuItemHandler(c *gin.Context) {
	id := c.Param("id")
	if err := archiveMenuItem(app.DB, id); err != nil {
		writeMenuError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": id, "active": false})
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
	// Initialize as empty slice to ensure JSON returns [] instead of null when empty
	response := make([]map[string]interface{}, 0)

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
					paidIDs, _ := completedPaidItemIDs(app.DB, order.ID)
					sessionData["paid_item_ids"] = paidIDs
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

	// Process selected items into order items (prices from menu_items store)
	var orderItems []OrderItem
	var total float64

	for _, selectedItem := range req.SelectedItems {
		if selectedItem.Qty <= 0 {
			continue // Skip items with zero or negative quantity
		}

		menuItem, err := getMenuItemByID(app.DB, selectedItem.ID)
		if err != nil {
			continue // Unknown menu id — same as previous slice miss
		}

		itemPrice := lineItemUnitPrice(menuItem, selectedItem.Toppings)

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

	// First, verify the QR session exists
	var qrSession QRSession
	result := app.DB.First(&qrSession, "id = ?", req.QRID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "QR session not found"})
		return
	}

	// Convert selected menu items to order items (prices from menu_items store)
	var orderItems []OrderItem
	var total float64

	for _, selectedItem := range req.SelectedItems {
		if selectedItem.Qty <= 0 {
			continue // Skip items with invalid quantity
		}

		menuItem, err := getMenuItemByID(app.DB, selectedItem.ID)
		if err != nil {
			continue // Unknown menu id — same as previous slice miss
		}

		// Validate MenuID exists - critical for data integrity
		if selectedItem.MenuID == "" {
			log.Printf("POSOrder: selected item missing MenuID (id=%s qty=%d)", selectedItem.ID, selectedItem.Qty)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid item: missing unique identifier"})
			return
		}

		itemPrice := lineItemUnitPrice(menuItem, selectedItem.Toppings)

		orderItem := OrderItem{
			ID:       menuItem.ID,
			MenuID:   selectedItem.MenuID,
			Name:     menuItem.Name,
			Price:    menuItem.Price,
			Qty:      selectedItem.Qty,
			Toppings: selectedItem.Toppings,
		}
		orderItems = append(orderItems, orderItem)
		total += itemPrice * float64(selectedItem.Qty)
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
