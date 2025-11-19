package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// OpenpayService handles communication with the Openpay API
type OpenpayService struct {
	MerchantID string
	PrivateKey string
	BaseURL    string
	HTTPClient *http.Client
}

// NewOpenpayService creates a new Openpay service instance
func NewOpenpayService(merchantID, privateKey string, sandboxMode bool) *OpenpayService {
	baseURL := "https://api.openpay.mx/v1"
	if sandboxMode {
		baseURL = "https://sandbox-api.openpay.mx/v1"
	}

	return &OpenpayService{
		MerchantID: merchantID,
		PrivateKey: privateKey,
		BaseURL:    baseURL,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ChargeRequest represents the charge request payload
type ChargeRequest struct {
	SourceID        string   `json:"source_id"`         // Token ID from frontend
	Method          string   `json:"method"`            // "card"
	Amount          float64  `json:"amount"`            // Amount to charge
	Description     string   `json:"description"`       // Charge description
	DeviceSessionID string   `json:"device_session_id"` // Device fingerprint
	Customer        Customer `json:"customer"`          // Customer information
}

// Customer represents customer information
type Customer struct {
	Name        string `json:"name"`
	LastName    string `json:"last_name,omitempty"`
	PhoneNumber string `json:"phone_number,omitempty"`
	Email       string `json:"email,omitempty"`
}

// ChargeResponse represents the Openpay charge response
type ChargeResponse struct {
	ID              string      `json:"id"`
	Amount          float64     `json:"amount"`
	Authorization   string      `json:"authorization"`
	Method          string      `json:"method"`
	OperationType   string      `json:"operation_type"`
	TransactionType string      `json:"transaction_type"`
	Status          string      `json:"status"`
	Currency        string      `json:"currency"`
	CreationDate    string      `json:"creation_date"`
	Description     string      `json:"description"`
	ErrorMessage    string      `json:"error_message,omitempty"`
	OrderID         string      `json:"order_id,omitempty"`
	Card            *CardInfo   `json:"card,omitempty"`
	Customer        interface{} `json:"customer,omitempty"`
}

// CardInfo represents card information from the response
type CardInfo struct {
	Type            string `json:"type"`
	Brand           string `json:"brand"`
	CardNumber      string `json:"card_number"`
	HolderName      string `json:"holder_name"`
	ExpirationYear  string `json:"expiration_year"`
	ExpirationMonth string `json:"expiration_month"`
	BankName        string `json:"bank_name"`
	BankCode        string `json:"bank_code"`
}

// OpenpayError represents an error response from Openpay
type OpenpayError struct {
	Category    string   `json:"category"`
	Description string   `json:"description"`
	HTTPCode    int      `json:"http_code"`
	ErrorCode   int      `json:"error_code"`
	RequestID   string   `json:"request_id"`
	FraudRules  []string `json:"fraud_rules,omitempty"`
}

func (e *OpenpayError) Error() string {
	return fmt.Sprintf("Openpay error [%d]: %s (category: %s)", e.ErrorCode, e.Description, e.Category)
}

// CreateCharge processes a payment charge using a token
func (s *OpenpayService) CreateCharge(req ChargeRequest) (*ChargeResponse, error) {
	url := fmt.Sprintf("%s/%s/charges", s.BaseURL, s.MerchantID)

	// Marshal request to JSON
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal charge request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.SetBasicAuth(s.PrivateKey, "") // Openpay uses HTTP Basic Auth with private key as username

	// Execute request
	resp, err := s.HTTPClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to execute HTTP request: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Check for error response
	if resp.StatusCode >= 400 {
		var openpayErr OpenpayError
		if err := json.Unmarshal(body, &openpayErr); err != nil {
			return nil, fmt.Errorf("openpay request failed with status %d: %s", resp.StatusCode, string(body))
		}
		openpayErr.HTTPCode = resp.StatusCode
		return nil, &openpayErr
	}

	// Parse success response
	var chargeResp ChargeResponse
	if err := json.Unmarshal(body, &chargeResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal charge response: %w", err)
	}

	return &chargeResp, nil
}

// ValidateCharge checks if a charge was successful
func (c *ChargeResponse) IsSuccessful() bool {
	return c.Status == "completed" || c.Status == "in_progress"
}

// GetErrorMessage returns a user-friendly error message
func (c *ChargeResponse) GetErrorMessage() string {
	if c.ErrorMessage != "" {
		return c.ErrorMessage
	}
	if c.Status == "failed" {
		return "La transacción falló. Verifica los datos de tu tarjeta."
	}
	if c.Status == "cancelled" {
		return "La transacción fue cancelada."
	}
	return "Error desconocido al procesar el pago."
}
