package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"munch-app-backend/config"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupMenuHTTPApp(t *testing.T) (*App, string) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	dsn := "file:" + t.Name() + "?mode=memory&cache=shared"
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&StaffUser{}, &MenuItem{}); err != nil {
		t.Fatalf("automigrate: %v", err)
	}
	if err := seedMenuItems(db); err != nil {
		t.Fatalf("seed: %v", err)
	}

	hash, err := HashPassword("test-password")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	user := StaffUser{
		ID:           uuid.New().String(),
		Username:     "staff",
		PasswordHash: hash,
		Role:         "staff",
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}

	app := &App{
		DB: db,
		Config: &config.Config{
			JWTSecret:   "test-jwt-secret-for-menu-write",
			FrontendURL: "http://localhost:3000",
		},
		Logger: zerolog.Nop(),
	}
	app.initRouter()

	token, err := app.generateJWT(&user)
	if err != nil {
		t.Fatalf("jwt: %v", err)
	}
	return app, token
}

func doJSON(t *testing.T, app *App, method, path, token string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("encode: %v", err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	app.Router.ServeHTTP(w, req)
	return w
}

type menuItemsPayload struct {
	Items []MenuItem `json:"items"`
}

func decodeItems(t *testing.T, w *httptest.ResponseRecorder) []MenuItem {
	t.Helper()
	var payload menuItemsPayload
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode items: %v body=%s", err, w.Body.String())
	}
	return payload.Items
}

func findItem(items []MenuItem, id string) *MenuItem {
	for i := range items {
		if items[i].ID == id {
			return &items[i]
		}
	}
	return nil
}

func TestMenuWriteRequiresAuth(t *testing.T) {
	app, _ := setupMenuHTTPApp(t)

	w := doJSON(t, app, http.MethodPost, "/api/menu/items", "", map[string]any{
		"name":  "Tacos de Suadero (3)",
		"price": 13.5,
	})
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("POST without auth status=%d, want 401 body=%s", w.Code, w.Body.String())
	}

	w = doJSON(t, app, http.MethodPut, "/api/menu/items/tacos_pastor", "", map[string]any{
		"price": 99.5,
	})
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("PUT without auth status=%d, want 401", w.Code)
	}

	w = doJSON(t, app, http.MethodDelete, "/api/menu/items/tacos_pastor", "", nil)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("DELETE without auth status=%d, want 401", w.Code)
	}
}

func TestPublicMenuListUnauthenticated(t *testing.T) {
	app, _ := setupMenuHTTPApp(t)
	w := doJSON(t, app, http.MethodGet, "/api/menu/items", "", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("GET public menu status=%d, want 200 body=%s", w.Code, w.Body.String())
	}
	items := decodeItems(t, w)
	if len(items) == 0 {
		t.Fatal("expected seeded items")
	}
}

func TestMenuCreateListUpdatePriceArchiveHTTP(t *testing.T) {
	app, token := setupMenuHTTPApp(t)

	create := doJSON(t, app, http.MethodPost, "/api/menu/items", token, map[string]any{
		"name":  "Tacos de Suadero (3)",
		"price": 13.5,
	})
	if create.Code != http.StatusCreated {
		t.Fatalf("create status=%d, want 201 body=%s", create.Code, create.Body.String())
	}
	var created MenuItem
	if err := json.Unmarshal(create.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode created: %v", err)
	}
	if created.ID == "" || created.Price != 13.5 {
		t.Fatalf("created=%+v", created)
	}
	if !created.Active {
		t.Fatal("created item should be active")
	}

	public := doJSON(t, app, http.MethodGet, "/api/menu/items", "", nil)
	if public.Code != http.StatusOK {
		t.Fatalf("public list status=%d body=%s", public.Code, public.Body.String())
	}
	listed := findItem(decodeItems(t, public), created.ID)
	if listed == nil {
		t.Fatal("created item missing from public GET")
	}
	if listed.Price != 13.5 {
		t.Fatalf("public price=%v, want 13.5", listed.Price)
	}

	got, err := getMenuItemByID(app.DB, created.ID)
	if err != nil {
		t.Fatalf("store get: %v", err)
	}
	unit := lineItemUnitPrice(got, nil)
	if unit != 13.5 {
		t.Fatalf("unit after create=%v, want 13.5", unit)
	}

	upd := doJSON(t, app, http.MethodPut, "/api/menu/items/"+created.ID, token, map[string]any{
		"price": 15.0,
	})
	if upd.Code != http.StatusOK {
		t.Fatalf("update status=%d body=%s", upd.Code, upd.Body.String())
	}

	public = doJSON(t, app, http.MethodGet, "/api/menu/items", "", nil)
	listed = findItem(decodeItems(t, public), created.ID)
	if listed == nil || listed.Price != 15.0 {
		t.Fatalf("public GET after price update: %+v", listed)
	}
	got, err = getMenuItemByID(app.DB, created.ID)
	if err != nil {
		t.Fatalf("store get after update: %v", err)
	}
	if lineItemUnitPrice(got, nil) != 15.0 {
		t.Fatalf("price helper=%v, want 15 (not create-time 13.5)", lineItemUnitPrice(got, nil))
	}

	del := doJSON(t, app, http.MethodDelete, "/api/menu/items/"+created.ID, token, nil)
	if del.Code != http.StatusOK {
		t.Fatalf("archive status=%d body=%s", del.Code, del.Body.String())
	}

	public = doJSON(t, app, http.MethodGet, "/api/menu/items", "", nil)
	if findItem(decodeItems(t, public), created.ID) != nil {
		t.Fatal("archived item still on public GET")
	}

	admin := doJSON(t, app, http.MethodGet, "/api/admin/menu/items", token, nil)
	if admin.Code != http.StatusOK {
		t.Fatalf("admin list status=%d body=%s", admin.Code, admin.Body.String())
	}
	staff := findItem(decodeItems(t, admin), created.ID)
	if staff == nil {
		t.Fatal("archived item missing from staff GET")
	}
	if staff.Active {
		t.Fatal("staff GET should show active=false after archive")
	}
}
