package config

import (
	"os"
	"strconv"
)

// Config holds all configuration for the application
type Config struct {
	APIPort            int
	FrontendURL        string
	APIURL             string
	DatabaseURL        string
	DatabaseType       string // "sqlite" or "postgres"
	JWTSecret          string // Secret key for JWT token signing
	OpenpayMerchantID  string // Openpay merchant ID
	OpenpayPrivateKey  string // Openpay private API key
	OpenpaySandboxMode bool   // Openpay sandbox mode
}

// LoadConfig loads configuration from environment variables with defaults
func LoadConfig() *Config {
	config := &Config{
		APIPort:            8080,
		FrontendURL:        "http://localhost:3000",
		APIURL:             "http://localhost:8080",
		DatabaseType:       "postgres",
		DatabaseURL:        "postgres://munch_user:munch_password@localhost:5432/munch_app_dev?sslmode=disable",
		JWTSecret:          "munch-app-secret-change-in-production",
		OpenpayMerchantID:  "", // Set via OPENPAY_MERCHANT_ID env var
		OpenpayPrivateKey:  "", // Set via OPENPAY_PRIVATE_KEY env var
		OpenpaySandboxMode: true,
	}

	// Load from environment variables if they exist
	if port := os.Getenv("API_PORT"); port != "" {
		if p, err := strconv.Atoi(port); err == nil {
			config.APIPort = p
		}
	}

	if frontendURL := os.Getenv("FRONTEND_URL"); frontendURL != "" {
		config.FrontendURL = frontendURL
	}

	if apiURL := os.Getenv("API_URL"); apiURL != "" {
		config.APIURL = apiURL
	}

	if dbType := os.Getenv("DATABASE_TYPE"); dbType != "" {
		config.DatabaseType = dbType
	}

	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		config.DatabaseURL = dbURL
	}

	if jwtSecret := os.Getenv("JWT_SECRET"); jwtSecret != "" {
		config.JWTSecret = jwtSecret
	}

	// Openpay configuration
	if merchantID := os.Getenv("OPENPAY_MERCHANT_ID"); merchantID != "" {
		config.OpenpayMerchantID = merchantID
	}

	if privateKey := os.Getenv("OPENPAY_PRIVATE_KEY"); privateKey != "" {
		config.OpenpayPrivateKey = privateKey
	}

	if sandboxMode := os.Getenv("OPENPAY_SANDBOX_MODE"); sandboxMode == "false" {
		config.OpenpaySandboxMode = false
	}

	return config
}

// GetCheckURL returns the full check URL for a given QR ID
func (c *Config) GetCheckURL(qrID string) string {
	return c.FrontendURL + "/check/" + qrID
}

// GetAllowedOrigins returns the allowed CORS origins
func (c *Config) GetAllowedOrigins() []string {
	return []string{c.FrontendURL}
}
