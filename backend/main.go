package main

import (
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type App struct {
	DB     *gorm.DB
	Router *gin.Engine
}

type Order struct {
	ID        string `json:"id" gorm:"primaryKey"`
	Items     string `json:"items" gorm:"type:text"` // JSON string for now
	Total     float64 `json:"total"`
	Status    string `json:"status"` // open, paid, closed
	CreatedAt int64  `json:"created_at" gorm:"autoCreateTime"`
}

func main() {
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
	return app.DB.AutoMigrate(&Order{})
}

func (app *App) initRouter() {
	app.Router = gin.Default()
	
	// Enable CORS for frontend
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	app.Router.Use(cors.New(config))
	
	// Routes
	api := app.Router.Group("/api")
	{
		api.POST("/qr/generate", app.generateQR)
		api.GET("/orders/:id", app.getOrder)
		api.POST("/orders", app.createOrder)
	}
	
	// Health check
	app.Router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
}
