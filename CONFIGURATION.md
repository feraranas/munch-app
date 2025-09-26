# Configuration Guide

This document explains how to configure the Munch App for different environments (development, staging, production).

## Overview

The application uses environment variables to configure API endpoints, WebSocket URLs, and CORS settings. This allows the same codebase to work across different environments without hardcoded URLs.

## Frontend Configuration

### Environment Variables

The frontend uses the following environment variables:

- `REACT_APP_API_URL`: Backend API URL (default: `http://localhost:8080`)
- `REACT_APP_WS_URL`: WebSocket URL (default: `ws://localhost:8080`)
- `REACT_APP_FRONTEND_URL`: Frontend URL (default: `http://localhost:3000`)

### Setup

1. Copy the example environment file:
   ```bash
   cd frontend
   cp env.example .env
   ```

2. Edit `.env` with your environment-specific values:
   ```bash
   # Development
   REACT_APP_API_URL=http://localhost:8080
   REACT_APP_WS_URL=ws://localhost:8080
   REACT_APP_FRONTEND_URL=http://localhost:3000
   ```

### Production Example

For production deployment:

```bash
# Production
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_WS_URL=wss://api.yourdomain.com
REACT_APP_FRONTEND_URL=https://yourdomain.com
```

## Backend Configuration

### Environment Variables

The backend uses the following environment variables:

- `API_PORT`: Server port (default: `8080`)
- `FRONTEND_URL`: Frontend URL for CORS (default: `http://localhost:3000`)
- `API_URL`: Backend API URL (default: `http://localhost:8080`)

### Setup

1. Copy the example environment file:
   ```bash
   cd backend
   cp env.example .env
   ```

2. Edit `.env` with your environment-specific values:
   ```bash
   # Development
   API_PORT=8080
   FRONTEND_URL=http://localhost:3000
   API_URL=http://localhost:8080
   ```

### Production Example

For production deployment:

```bash
# Production
API_PORT=8080
FRONTEND_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
```

## Centralized Configuration

### Frontend

The frontend uses a centralized configuration system in `src/config/environment.ts`:

```typescript
import { api, frontend } from '../config/environment';

// Use API endpoints
const response = await fetch(api.qr(orderId));
const wsUrl = api.wsSession();

// Use frontend URLs
const checkUrl = frontend.checkUrl(orderId);
```

### Backend

The backend uses a centralized configuration system in `config/config.go`:

```go
import "./config"

// Load configuration
config := config.LoadConfig()

// Use configuration
checkURL := config.GetCheckURL(qrID)
allowedOrigins := config.GetAllowedOrigins()
```

## Deployment Examples

### Docker Compose

```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    environment:
      - REACT_APP_API_URL=http://backend:8080
      - REACT_APP_WS_URL=ws://backend:8080
      - REACT_APP_FRONTEND_URL=http://localhost:3000
    ports:
      - "3000:80"

  backend:
    build: ./backend
    environment:
      - API_PORT=8080
      - FRONTEND_URL=http://localhost:3000
      - API_URL=http://backend:8080
    ports:
      - "8080:8080"
```

### Kubernetes

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: munch-app-config
data:
  REACT_APP_API_URL: "https://api.yourdomain.com"
  REACT_APP_WS_URL: "wss://api.yourdomain.com"
  REACT_APP_FRONTEND_URL: "https://yourdomain.com"
  API_PORT: "8080"
  FRONTEND_URL: "https://yourdomain.com"
  API_URL: "https://api.yourdomain.com"
```

## Benefits

1. **No Hardcoded URLs**: All URLs are configurable via environment variables
2. **Environment-Specific**: Different configurations for dev, staging, and production
3. **Centralized**: Single source of truth for all configuration
4. **Type-Safe**: TypeScript/Go type safety for configuration
5. **Production-Ready**: Easy deployment to any environment

## Migration from Hardcoded URLs

The following hardcoded URLs have been replaced with centralized configuration:

- ✅ `http://localhost:8080` → `api.baseUrl`
- ✅ `http://localhost:3000` → `frontend.baseUrl`
- ✅ `ws://localhost:8080` → `api.wsSession()`
- ✅ CORS origins → `config.GetAllowedOrigins()`

All components now use the centralized configuration system for better maintainability and deployment flexibility.
