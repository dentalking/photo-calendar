#!/bin/bash

# Photo extraction API test script
echo "🧪 Testing Photo Extraction API..."

# Set variables
API_URL="https://photo-calendar.vercel.app/api/photo/extract"
IMAGE_PATH="test-images/tech-conference-2025.png"

# Test options
OPTIONS='{
  "extractEvents": true,
  "minConfidence": 0.5,
  "autoConfirm": false,
  "defaultCategory": "conference",
  "defaultColor": "#0066CC"
}'

# First, we need to get a session token
echo "📝 Getting authentication token..."

# For testing, we'll use the existing session from browser
# In production, you would authenticate first

# Test the API with curl
echo "📸 Uploading image and extracting events..."
curl -X POST "$API_URL" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@$IMAGE_PATH" \
  -F "options=$OPTIONS" \
  -c cookies.txt \
  -b cookies.txt \
  -o response.json \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "📄 Response:"
if [ -f response.json ]; then
  python3 -m json.tool response.json
else
  echo "No response file found"
fi

# Clean up
rm -f cookies.txt response.json