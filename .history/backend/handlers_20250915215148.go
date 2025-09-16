package main

import (
	"encoding/base64"
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
	
	// Create or update order in database (for now, just create a placeholder)
	order := Order{
		ID:     req.OrderID,
		Items:  `[{"id":"1","name":"Sample Item","price":10.99,"qty":1}]`, // Static for now
		Total:  10.99,
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
	
	c.JSON(http.StatusOK, order)
}

func (app *App) createOrder(c *gin.Context) {
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Generate unique order ID
	orderID := uuid.New().String()
	
	// For simplicity, convert items to JSON string
	// In a real app, you'd have a proper items table
	itemsJSON := `[]` // TODO: Marshal req.Items to JSON
	
	order := Order{
		ID:     orderID,
		Items:  itemsJSON,
		Total:  req.Total,
		Status: "open",
	}
	
	if err := app.DB.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}
	
	c.JSON(http.StatusCreated, order)
}
