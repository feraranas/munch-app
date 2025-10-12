package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"munch-app-backend/config"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	gingin "gopkg.in/DataDog/dd-trace-go.v1/contrib/gin-gonic/gin"
	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type App struct {
	DB     *gorm.DB
	Router *gin.Engine
	Hub    *Hub
	Config *config.Config
	Logger zerolog.Logger
}

type QRSession struct {
	ID           string  `json:"id" gorm:"primaryKey"`           // QR-ID (persistent)
	QRImageData  string  `json:"qr_image_data" gorm:"type:text"` // Base64 QR image
	CurrentOrder *string `json:"current_order,omitempty"`        // Current active order ID
	TableNumber  *string `json:"table_number,omitempty"`         // Optional table identifier
	CreatedAt    int64   `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    int64   `json:"updated_at" gorm:"autoUpdateTime"`
}

type Order struct {
	ID        string  `json:"id" gorm:"primaryKey"`
	QRSession string  `json:"qr_session"`             // Links to QRSession.ID
	Items     string  `json:"items" gorm:"type:text"` // JSON string for now
	Total     float64 `json:"total"`
	Status    string  `json:"status"` // open, paid, closed
	CreatedAt int64   `json:"created_at" gorm:"autoCreateTime"`
}

func main() {
	// Setup zerolog - the "Hello World" of zerolog
	// 1. Set global time format
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnixMs

	// 2. Create logger instance with pretty console output for development
	logger := zerolog.New(zerolog.ConsoleWriter{Out: os.Stdout}).
		Level(zerolog.InfoLevel).
		With().
		Timestamp().
		Str("service", "munch-app-backend").
		Logger()

	// 3. Log startup message - zerolog "Hello World"
	logger.Info().Msg("🚀 Starting Munch App Backend with zerolog!")

	// Start Datadog tracer
	tracer.Start(
		tracer.WithService(os.Getenv("DD_SERVICE")),
		tracer.WithEnv(os.Getenv("DD_ENV")),
	)
	defer tracer.Stop()

	app := &App{
		Logger: logger,
	}

	// Load configuration
	app.Config = config.LoadConfig()

	// Initialize database
	if err := app.initDB(); err != nil {
		app.Logger.Fatal().Err(err).Msg("Failed to initialize database")
	}

	// Initialize WebSocket hub
	app.Hub = NewHub()
	go app.Hub.Run()

	// Initialize router with request logging middleware
	app.initRouter()

	app.Logger.Info().Int("port", app.Config.APIPort).Msg("Server starting")
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", app.Config.APIPort), app.Router))
}

func (app *App) initDB() error {
	var err error
	var dialector gorm.Dialector

	switch app.Config.DatabaseType {
	case "postgres":
		dialector = postgres.Open(app.Config.DatabaseURL)
	case "sqlite":
		dialector = sqlite.Open(app.Config.DatabaseURL)
	default:
		return fmt.Errorf("unsupported database type: %s", app.Config.DatabaseType)
	}

	app.DB, err = gorm.Open(dialector, &gorm.Config{})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	app.Logger.Info().Str("database_url", app.Config.DatabaseURL).Msg("Connected to database")

	// Auto migrate the schema
	return app.DB.AutoMigrate(&QRSession{}, &Order{})
}

func (app *App) initRouter() {
	app.Router = gin.Default()

	// Add request logging middleware - zerolog "Hello World" for HTTP requests
	app.Router.Use(app.requestLoggingMiddleware())

	// Add Datadog tracing middleware
	app.Router.Use(gingin.Middleware("backend"))

	// Enable CORS for frontend
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = app.Config.GetAllowedOrigins()
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	corsConfig.AllowCredentials = true
	app.Router.Use(cors.New(corsConfig))

	// Routes
	api := app.Router.Group("/api")
	{
		api.POST("/qr/create", app.createQRSession)
		api.GET("/qr/:qrId", app.getOrderByQR)
		api.GET("/orders/:id", app.getOrder)
		api.POST("/orders", app.createOrder)
		api.GET("/menu/items", app.getMenuItems)
		api.POST("/pos/order", app.POSOrder)
		api.PUT("/orders/update", app.updateOrder)
		api.GET("/admin/sessions", app.getAllQRSessions)
	}

	// Websocket routes
	ws := app.Router.Group("/ws")
	{
		ws.GET("/session", app.webSocketHandler)
		// ws.GET("/session/:qrId", app.webSocketHandler)
	}

	// Health check
	app.Router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
}

// requestLoggingMiddleware demonstrates zerolog's structured logging for HTTP requests
func (app *App) requestLoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Process request
		c.Next()

		// Calculate duration
		duration := time.Since(start)

		// Log request with zerolog - this is the "Hello World" of request logging!
		app.Logger.Info().
			Str("method", c.Request.Method).
			Str("path", c.Request.URL.Path).
			Str("ip", c.ClientIP()).
			Int("status", c.Writer.Status()).
			Dur("duration_ms", duration).
			Str("user_agent", c.Request.UserAgent()).
			Msg("HTTP Request")
	}
}
