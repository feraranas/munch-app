# Munch App - Restaurant Bill Splitting

A QR code-based restaurant bill splitting application.

### Prerequisites
- Node.js 16+ 
- Go 1.21+
- Make (optional)

### Environment Setup

**First, set up environment variables:**
```bash
# Run the setup script to create .env files
./setup-env.sh
```

This creates the necessary environment files for both frontend and backend with the correct ports (8080 for backend, 3000 for frontend).

### Run script to test repository health

```bash
chmod +x test-setup.sh
./test-setup.sh
```

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

The frontend will start on `http://localhost:3001`

## Usage

1. **Generate QR Code**: Visit `http://localhost:3001/admin/qr` to generate a test QR code
2. **View Check**: Scan the QR code or visit `http://localhost:3001/check/ORDER-ID` 
3. **Landing Page**: The main page at `http://localhost:3001/` explains the app

## API Endpoints

- `POST /api/qr/generate` - Generate QR code for an order
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create new order
- `GET /health` - Health check

## Development

### Make Commands (Backend)
```bash
make run     # Run the server
make build   # Build binary
make test    # Run tests
make deps    # Install dependencies
make clean   # Clean build artifacts
```

### Docker Commands (Backend)

```bash
docker-compose up backend
```

### Frontend Scripts
```bash
npm start    # Development server
npm build    # Production build
npm test     # Run tests
```

### Docker Commands (Frontend)

```bash
docker-compose up frontend
```

### Build and start all services at once
```bash
docker-compose up --build
docker-compose up --force-recreate
```
