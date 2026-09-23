package config

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"os"
	"strconv"
)

// Config holds all configuration for the application
type Config struct {
	APIPort              int
	FrontendURL          string
	APIURL               string
	DatabaseURL          string
	DatabaseType         string // "sqlite" or "postgres"
	JWTSecret            string // Secret key for JWT token signing
	StripeSecretKey      string // Stripe secret API key (sk_...)
	StripeWebhookSecret  string // Stripe webhook signing secret (whsec_...)
	StripePublishableKey string // Optional; docs / frontend alignment only
}

// LoadConfig loads configuration from environment variables with defaults
func LoadConfig() *Config {
	config := &Config{
		APIPort:              8080,
		FrontendURL:          "http://localhost:3000",
		APIURL:               "http://localhost:8080",
		DatabaseType:         "postgres",
		DatabaseURL:          "postgres://munch_user:munch_password@localhost:5432/munch_app_dev?sslmode=disable",
		JWTSecret:            "", // Must be provided via JWT_SECRET; a random one is generated if unset
		StripeSecretKey:      "", // Set via STRIPE_SECRET_KEY
		StripeWebhookSecret:  "", // Set via STRIPE_WEBHOOK_SECRET
		StripePublishableKey: "", // Set via STRIPE_PUBLISHABLE_KEY (optional on backend)
	}

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

	if sk := os.Getenv("STRIPE_SECRET_KEY"); sk != "" {
		config.StripeSecretKey = sk
	}
	if wh := os.Getenv("STRIPE_WEBHOOK_SECRET"); wh != "" {
		config.StripeWebhookSecret = wh
	}
	if pk := os.Getenv("STRIPE_PUBLISHABLE_KEY"); pk != "" {
		config.StripePublishableKey = pk
	}

	// Never fall back to a hardcoded JWT secret: a known signing key lets anyone
	// forge tokens. If unset, generate a random secret for this process. Tokens
	// then won't survive a restart, which is acceptable for dev; production must
	// set JWT_SECRET explicitly.
	if config.JWTSecret == "" {
		buf := make([]byte, 32)
		if _, err := rand.Read(buf); err != nil {
			log.Fatalf("failed to generate a random JWT secret: %v", err)
		}
		config.JWTSecret = hex.EncodeToString(buf)
		log.Println("WARNING: JWT_SECRET is not set; generated a random secret. " +
			"Sessions will not persist across restarts. Set JWT_SECRET in production.")
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
