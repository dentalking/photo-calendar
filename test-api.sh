#\!/bin/bash
# Test with multipart form data as the API expects
curl -X POST https://photo-calendar.vercel.app/api/photo/extract \
  -F "file=@test.png" \
  -F "options={\"extractEvents\":true,\"autoConfirm\":false,\"minConfidence\":0.7,\"defaultCategory\":\"other\",\"defaultColor\":\"#3B82F6\"}" \
  -v
