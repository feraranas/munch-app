#!/bin/bash

# Setup environment variables for Munch App
echo "Setting up environment variables for Munch App..."

# Create frontend .env file
echo "Creating frontend .env file..."
cat > frontend/.env << EOF
# Frontend Environment Configuration
REACT_APP_API_URL=http://localhost:8080
REACT_APP_WS_URL=ws://localhost:8080
REACT_APP_FRONTEND_URL=http://localhost:3000
EOF

# Create backend .env file
echo "Creating backend .env file..."
cat > backend/.env << EOF
# Backend Environment Configuration
API_PORT=8080
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:8080
EOF

echo "Environment files created successfully!"
echo ""
echo "Frontend .env:"
cat frontend/.env
echo ""
echo "Backend .env:"
cat backend/.env
echo ""
echo "You can now start the application with:"
echo "  Backend: cd backend && go run ."
echo "  Frontend: cd frontend && npm start"
