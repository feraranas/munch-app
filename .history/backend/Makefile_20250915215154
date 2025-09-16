.PHONY: run build test clean deps

# Run the application
run:
	go run .

# Build the application
build:
	go build -o bin/munch-app-backend .

# Install dependencies
deps:
	go mod tidy
	go mod download

# Test the application
test:
	go test -v ./...

# Clean build artifacts
clean:
	rm -rf bin/
	rm -f munch_app.db

# Format code
fmt:
	go fmt ./...

# Start development server with auto-reload (requires air)
dev:
	air

# Install air for development
install-air:
	go install github.com/cosmtrek/air@latest
