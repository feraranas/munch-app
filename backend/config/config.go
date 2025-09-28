package config

import (
	"os"
	"strconv"
)

// Config holds all configuration for the application
type Config struct {
	APIPort      int
	FrontendURL  string
	APIURL       string
	DatabaseURL  string
	DatabaseType string // "sqlite" or "postgres"
}

// LoadConfig loads configuration from environment variables with defaults
func LoadConfig() *Config {
	config := &Config{
		APIPort:      8080,
		FrontendURL:  "http://localhost:3000",
		APIURL:       "http://localhost:8080",
		DatabaseType: "postgres",
		DatabaseURL:  "postgres://munch_user:munch_password@localhost:5432/munch_app_dev?sslmode=disable",
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
