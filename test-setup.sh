#!/bin/bash

echo "🚀 Testing Munch App Iteration 1 Setup"
echo "======================================"

# Test backend health
echo "Testing backend health..."
if curl -s http://localhost:8080/health > /dev/null; then
    echo "✅ Backend is running on port 8080"
else
    echo "❌ Backend is not accessible"
    exit 1
fi

# Test QR generation
echo "Testing QR code generation..."
RESPONSE=$(curl -s -X POST http://localhost:8080/api/qr/generate \
    -H "Content-Type: application/json" \
    -d '{"orderId":"TEST-SETUP"}')

if echo "$RESPONSE" | grep -q "qrCodeUrl"; then
    echo "✅ QR code generation working"
else
    echo "❌ QR code generation failed"
    exit 1
fi

# Test frontend
echo "Testing frontend..."
if curl -s -I http://localhost:3000 | grep -q "200 OK"; then
    echo "✅ Frontend is running on port 3000"
else
    echo "❌ Frontend is not accessible"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Iteration 1 setup is complete."
echo ""
echo "🔗 Access points:"
echo "   Frontend: http://localhost:3000"
echo "   Backend: http://localhost:8080"
echo "   QR Admin: http://localhost:3000/admin/qr"
echo "   Example Check: http://localhost:3000/check/TEST-001"
echo ""
echo "📖 Next: Proceed with Iteration 2 (POS Integration)"
