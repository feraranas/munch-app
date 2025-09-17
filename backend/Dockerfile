# Multi-stage Dockerfile for Go backend

# Development stage
FROM golang:1.21-bullseye AS development

# Install air for live reloading in development (using compatible version)
RUN go install github.com/cosmtrek/air@v1.40.4

# Set working directory
WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Expose port 8080
EXPOSE 8080

# Default command for development (with hot reload)
CMD ["air", "-c", ".air.toml"]

# Build stage
FROM golang:1.21-bullseye AS build

# Set working directory
WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application with CGO enabled for SQLite
RUN CGO_ENABLED=1 GOOS=linux go build -o main .

# Production stage
FROM alpine:latest AS production

# Install ca-certificates for HTTPS requests and sqlite
RUN apk --no-cache add ca-certificates sqlite

# Set working directory
WORKDIR /root/

# Copy the binary from build stage
COPY --from=build /app/main .

# Expose port 8080
EXPOSE 8080

# Run the binary
CMD ["./main"]

# Default stage (development)
FROM development AS default
