#!/bin/bash

# Google Cloud OAuth Configuration Setup Script
# Project: photo-calendar-20250811-150939
# Purpose: Configure Google Calendar API OAuth permissions

set -e

PROJECT_ID="photo-calendar-20250811-150939"
CLIENT_ID="321098167940-88ce9sk71u7qu34erp0u3mrq41oo653b.apps.googleusercontent.com"

echo "🔧 Google Calendar OAuth Setup Script"
echo "====================================="
echo ""

# Step 1: Verify current project
echo "📋 Step 1: Verifying Google Cloud Project"
echo "Current project: $(gcloud config get-value project)"

if [ "$(gcloud config get-value project)" != "$PROJECT_ID" ]; then
    echo "⚠️  Switching to correct project..."
    gcloud config set project $PROJECT_ID
fi

# Step 2: Check Calendar API is enabled
echo ""
echo "📋 Step 2: Checking Calendar API Status"
if gcloud services list --enabled | grep -q calendar; then
    echo "✅ Calendar API is enabled"
else
    echo "⚠️  Calendar API is not enabled. Enabling now..."
    gcloud services enable calendar-json.googleapis.com
    echo "✅ Calendar API enabled"
fi

# Step 3: Check billing status
echo ""
echo "📋 Step 3: Checking Billing Status"
gcloud billing projects describe $PROJECT_ID 2>/dev/null && echo "✅ Billing is enabled" || echo "❌ Billing not configured"

# Step 4: Generate OAuth test URL
echo ""
echo "📋 Step 4: OAuth Configuration URLs"
echo ""
echo "🔗 OAuth Consent Screen Configuration:"
echo "   https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
echo ""
echo "🔗 OAuth Client Configuration:"
echo "   https://console.cloud.google.com/apis/credentials/oauthclient/$CLIENT_ID?project=$PROJECT_ID"
echo ""

# Step 5: Generate test URL with all scopes
echo "📋 Step 5: Test OAuth Flow URL"
echo ""
echo "🧪 Test this URL in an incognito/private browser window:"
echo "--------------------------------------------------------------------------------"

OAUTH_URL="https://accounts.google.com/o/oauth2/v2/auth?"
OAUTH_URL+="client_id=$CLIENT_ID&"
OAUTH_URL+="redirect_uri=https%3A%2F%2Fphoto-calendar.vercel.app%2Fapi%2Fauth%2Fcallback%2Fgoogle&"
OAUTH_URL+="response_type=code&"
OAUTH_URL+="scope=openid+email+profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events&"
OAUTH_URL+="access_type=offline&"
OAUTH_URL+="prompt=consent"

echo "$OAUTH_URL"
echo "--------------------------------------------------------------------------------"
echo ""

# Step 6: Instructions
echo "📝 Manual Configuration Required:"
echo "================================="
echo ""
echo "1️⃣  Open the OAuth Consent Screen URL above"
echo "2️⃣  Click 'EDIT APP'"
echo "3️⃣  Go to 'Scopes' section"
echo "4️⃣  Click 'ADD OR REMOVE SCOPES'"
echo "5️⃣  Search and add these scopes:"
echo "    ✅ .../auth/userinfo.email"
echo "    ✅ .../auth/userinfo.profile"
echo "    ✅ .../auth/calendar"
echo "    ✅ .../auth/calendar.events"
echo "6️⃣  Save all changes"
echo ""
echo "7️⃣  Remove existing app permissions:"
echo "    • Go to: https://myaccount.google.com/connections"
echo "    • Find 'Photo Calendar' and revoke access"
echo ""
echo "8️⃣  Test the OAuth URL in a private browser window"
echo "    • You should see Calendar permissions in the consent screen"
echo ""

# Step 7: Check current session
echo "🔍 Testing Current Session Status:"
echo ""
echo "Production session check:"
curl -s https://photo-calendar.vercel.app/api/auth/check-session | python3 -m json.tool 2>/dev/null || echo "Session check failed"

echo ""
echo "✨ Setup script completed!"
echo "Next steps: Follow the manual configuration instructions above."