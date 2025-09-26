package config

import (
	"os"
	"strconv"
)

// Config holds all configuration for the application
type Config struct {
	APIPort     int
	FrontendURL string
	APIURL      string
}

// LoadConfig loads configuration from environment variables with defaults
func LoadConfig() *Config {
	config := &Config{
		APIPort:     8081,
		FrontendURL: "http://localhost:3001",
		APIURL:      "http://localhost:8081",
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
