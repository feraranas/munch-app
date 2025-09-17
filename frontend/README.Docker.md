# Frontend Docker Setup

This directory contains a multi-stage Dockerfile for the React TypeScript frontend application.

## Docker Stages

### 1. Development Stage (default)
- Uses Node.js 18 Alpine
- Installs all dependencies including dev dependencies
- Runs the development server on port 3000
- Supports hot reload when volumes are mounted

### 2. Build Stage
- Compiles the React application for production
- Creates optimized static files

### 3. Production Stage
- Uses nginx Alpine for serving static files
- Includes custom nginx configuration for SPA routing
- Runs on port 80
- Optimized for production deployment

## Usage

### Development (with Docker Compose)
```bash
# From project root
docker-compose up frontend
```

### Development (standalone)
```bash
# Build development image
docker build --target development -t munch-frontend:dev .

# Run development container
docker run -p 3000:3000 -v $(pwd):/app -v /app/node_modules munch-frontend:dev
```

### Production Build
```bash
# Build production image
docker build --target production -t munch-frontend:prod .

# Run production container
docker run -p 80:80 munch-frontend:prod
```

### Production with Docker Compose
```bash
# From project root
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up frontend
```

## Environment Variables

- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:8080)

## Files

- `Dockerfile`: Multi-stage build configuration
- `nginx.conf`: Custom nginx configuration for production
- `.dockerignore`: Excludes unnecessary files from build context
- `docker-compose.prod.yml`: Production override configuration

## Features

- **Multi-stage builds**: Separate development and production stages
- **Optimized layers**: Efficient Docker layer caching
- **Security headers**: Added security headers in nginx
- **Gzip compression**: Enabled for better performance
- **SPA routing**: Proper handling of client-side routes
- **Static asset caching**: 1-year cache for immutable assets
