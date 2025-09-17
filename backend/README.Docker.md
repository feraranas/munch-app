# Backend Docker Setup

This directory contains a multi-stage Dockerfile for the Go backend service of the Munch App.

## Dockerfile Features

### Multi-Stage Build
- **Development Stage**: Alpine-based image with air for live reloading
- **Build Stage**: Debian-based build environment with CGO support for SQLite
- **Production Stage**: Minimal Alpine image with just the compiled binary

### Development
```bash
# Build development image
docker build -t munch-app-backend .

# Run with docker-compose (recommended)
docker-compose up backend
```

The development stage includes:
- Air for live reloading
- Full Go development environment
- Volume mounting for source code changes

### Production
```bash
# Build production image
docker build --target production -t munch-app-backend-prod .

# Run development container
docker run -p 8080:8080 -v $(pwd):/app -v /app/bin munch-app-backend

# Run with production docker-compose
docker-compose -f docker-compose.prod.yml up backend
```

The production stage includes:
- Minimal Alpine Linux base image
- Statically compiled Go binary
- SQLite support via CGO
- ca-certificates for HTTPS

## Configuration Files

- `Dockerfile`: Multi-stage build configuration
- `.air.toml`: Air configuration for live reloading in development
- `.dockerignore`: Excludes unnecessary files from build context

## Environment Variables

- `GIN_MODE`: Set to "debug" for development, "release" for production
- Port 8080 is exposed for the HTTP server

## Database

The application uses SQLite with CGO enabled, creating a `munch_app.db` file in the working directory.
