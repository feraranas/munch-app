package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	gingin "gopkg.in/DataDog/dd-trace-go.v1/contrib/gin-gonic/gin"
	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type App struct {
	DB     *gorm.DB
	Router *gin.Engine
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
	// Start Datadog tracer
	tracer.Start(
		tracer.WithService(os.Getenv("DD_SERVICE")),
		tracer.WithEnv(os.Getenv("DD_ENV")),
	)
	defer tracer.Stop()

	app := &App{}

	// Initialize database
	if err := app.initDB(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// Initialize router
	app.initRouter()

	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", app.Router))
}

func (app *App) initDB() error {
	var err error
	app.DB, err = gorm.Open(sqlite.Open("munch_app.db"), &gorm.Config{})
	if err != nil {
		return err
	}

	// Auto migrate the schema
	return app.DB.AutoMigrate(&QRSession{}, &Order{})
}

func (app *App) initRouter() {
	app.Router = gin.Default()

	// Add Datadog tracing middleware
	app.Router.Use(gingin.Middleware("backend"))

	// Enable CORS for frontend
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	app.Router.Use(cors.New(config))

	// Routes
	api := app.Router.Group("/api")
	{
		api.POST("/qr/create", app.createQRSession)
		api.GET("/qr/:qrId", app.getOrderByQR)
		api.GET("/orders/:id", app.getOrder)
		api.POST("/orders", app.createOrder)
		api.GET("/menu/items", app.getMenuItems)
		api.POST("/pos/mock-order", app.mockPOSOrder)
	}

	// Health check
	app.Router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
}
