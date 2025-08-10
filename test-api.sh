#!/bin/bash

# Test the photo extraction API with a text file
# This simulates testing without actual image processing

API_URL="http://localhost:3001"

echo "🧪 Testing Photo Calendar API"
echo "================================"
echo ""

# Test 1: Health check
echo "1. Testing health endpoint..."
curl -s "$API_URL/api/health" | jq '.'
echo ""

# Test 2: Test OCR extraction (with mock data)
echo "2. Testing OCR extraction with Korean text..."

# Create a simple test request
cat > test-request.json << EOF
{
  "text": "2024년 크리스마스 파티\n날짜: 2024년 12월 25일\n시간: 오후 7시\n장소: 강남 파티룸",
  "options": {
    "documentType": "poster",
    "language": "ko",
    "timezone": "Asia/Seoul"
  }
}
EOF

# Since we need multipart form data, we'll use a different approach
echo "Note: Full image upload test requires an actual image file."
echo "For now, testing basic API connectivity..."
echo ""

# Test 3: Check if API routes are accessible
echo "3. Checking API routes..."
routes=(
  "/api/events"
  "/api/auth/providers"
)

for route in "${routes[@]}"; do
  echo -n "  Testing $route: "
  status_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$route")
  if [ "$status_code" = "200" ] || [ "$status_code" = "401" ]; then
    echo "✅ OK ($status_code)"
  else
    echo "❌ Failed ($status_code)"
  fi
done

echo ""
echo "✨ API test completed!"
echo ""
echo "To test with an actual image:"
echo "  tsx test-upload.ts <path-to-image>"