# Munch App - Restaurant Bill Splitting

A QR code-based restaurant bill splitting application built with React.js frontend and Go backend.

## MVP Development - Iteration 1: Foundation

This is the foundation iteration that includes:
- ✅ Project repository structure
- ✅ React.js frontend with QR scanning landing page
- ✅ Go backend with QR code generation
- ✅ Basic database schema
- ✅ Simple QR code generation with hardcoded order ID

## Quick Start

### Prerequisites
- Node.js 16+ 
- Go 1.21+
- Make (optional)

### Backend Setup

```bash
cd backend
go mod tidy
make run
# or
go run .
```

The backend will start on `http://localhost:8080`

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The frontend will start on `http://localhost:3000`

## Usage

1. **Generate QR Code**: Visit `http://localhost:3000/admin/qr` to generate a test QR code
2. **View Check**: Scan the QR code or visit `http://localhost:3000/check/ORDER-ID` 
3. **Landing Page**: The main page at `http://localhost:3000/` explains the app

## API Endpoints

- `POST /api/qr/generate` - Generate QR code for an order
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create new order
- `GET /health` - Health check

## Architecture

```
┌─────────────┐    HTTP    ┌─────────────┐
│   React.js  │ ────────→ │     Go      │
│  Frontend   │           │   Backend   │
│  (Port 3000)│ ←──────── │ (Port 8080) │
└─────────────┘           └─────────────┘
                                 │
                                 ▼
                          ┌─────────────┐
                          │   SQLite    │
                          │  Database   │
                          └─────────────┘
```

## Next Steps (Iteration 2)

- [ ] POS mock API integration
- [ ] Real-time receipt display
- [ ] WebSocket implementation for live updates
- [ ] Enhanced order management

## Development

### Make Commands (Backend)
```bash
make run     # Run the server
make build   # Build binary
make test    # Run tests
make deps    # Install dependencies
make clean   # Clean build artifacts
```

### Frontend Scripts
```bash
npm start    # Development server
npm build    # Production build
npm test     # Run tests
```