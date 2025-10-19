package main

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// LoginRequest represents the login credentials
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents the login response with JWT token
type LoginResponse struct {
	Token    string `json:"token"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

// ValidateResponse represents the token validation response
type ValidateResponse struct {
	Valid    bool   `json:"valid"`
	Username string `json:"username,omitempty"`
	Role     string `json:"role,omitempty"`
	UserID   string `json:"user_id,omitempty"`
}

// JWTClaims represents the JWT token claims
type JWTClaims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// login handles staff login with username/password
func (app *App) login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		app.Logger.Warn().Err(err).Msg("Invalid login request")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username and password are required"})
		return
	}

	// Find user by username
	var user StaffUser
	if err := app.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		app.Logger.Warn().Str("username", req.Username).Msg("Login attempt with invalid username")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Compare password with stored hash
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		app.Logger.Warn().Str("username", req.Username).Msg("Login attempt with invalid password")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate JWT token
	token, err := app.generateJWT(&user)
	if err != nil {
		app.Logger.Error().Err(err).Msg("Failed to generate JWT token")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	app.Logger.Info().Str("username", user.Username).Str("user_id", user.ID).Msg("Successful login")

	c.JSON(http.StatusOK, LoginResponse{
		Token:    token,
		Username: user.Username,
		Role:     user.Role,
	})
}

// logout handles staff logout (client-side only for JWT)
func (app *App) logout(c *gin.Context) {
	// For JWT, logout is handled client-side by removing the token
	// We just log the action here
	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")

	app.Logger.Info().
		Interface("user_id", userID).
		Interface("username", username).
		Msg("User logged out")

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// validateToken checks if a JWT token is valid
func (app *App) validateToken(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusOK, ValidateResponse{Valid: false})
		return
	}

	// Extract token from "Bearer <token>"
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		c.JSON(http.StatusOK, ValidateResponse{Valid: false})
		return
	}

	// Parse and validate token
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(app.Config.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		c.JSON(http.StatusOK, ValidateResponse{Valid: false})
		return
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok {
		c.JSON(http.StatusOK, ValidateResponse{Valid: false})
		return
	}

	c.JSON(http.StatusOK, ValidateResponse{
		Valid:    true,
		Username: claims.Username,
		Role:     claims.Role,
		UserID:   claims.UserID,
	})
}

// generateJWT creates a JWT token for a staff user
func (app *App) generateJWT(user *StaffUser) (string, error) {
	claims := JWTClaims{
		UserID:   user.ID,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(app.Config.JWTSecret))
}

// authMiddleware validates JWT token and protects routes
func (app *App) authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			app.Logger.Warn().Str("path", c.Request.URL.Path).Msg("Missing authorization header")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			app.Logger.Warn().Msg("Invalid authorization header format")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		// Parse and validate token
		token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(app.Config.JWTSecret), nil
		})

		if err != nil {
			app.Logger.Warn().Err(err).Msg("Invalid token")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		if !token.Valid {
			app.Logger.Warn().Msg("Token is not valid")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token is not valid"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(*JWTClaims)
		if !ok {
			app.Logger.Warn().Msg("Invalid token claims")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		// Set user info in context for handlers to use
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)

		c.Next()
	}
}

// HashPassword generates a bcrypt hash for a password
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	return string(bytes), err
}
