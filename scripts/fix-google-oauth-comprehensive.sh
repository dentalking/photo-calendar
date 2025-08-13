#!/bin/bash

# Comprehensive Google OAuth Fix Script for Vercel Deployment
# This script diagnoses and helps fix Google OAuth authentication issues

echo "=== Google OAuth Comprehensive Fix ==="
echo "Deployment: https://photo-calendar.vercel.app"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Test current configuration
echo -e "${BLUE}Step 1: Testing current configuration...${NC}"
echo "Testing validation endpoint..."

VALIDATION_RESPONSE=$(curl -s "https://photo-calendar.vercel.app/api/auth/validate-config" -H "x-debug-secret: your-nextauth-secret-key-change-this-in-production")

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Validation endpoint accessible${NC}"
    
    STATUS=$(echo "$VALIDATION_RESPONSE" | jq -r '.status // "UNKNOWN"')
    TOTAL_ISSUES=$(echo "$VALIDATION_RESPONSE" | jq -r '.summary.totalIssues // 0')
    
    echo "   Status: $STATUS"
    echo "   Issues: $TOTAL_ISSUES"
    
    if [ "$TOTAL_ISSUES" -gt 0 ]; then
        echo -e "${YELLOW}Issues detected:${NC}"
        echo "$VALIDATION_RESPONSE" | jq -r '.issues[]' | while read issue; do
            echo "   - $issue"
        done
        
        echo -e "${BLUE}Recommendations:${NC}"
        echo "$VALIDATION_RESPONSE" | jq -r '.recommendations[]' | while read rec; do
            echo "   - $rec"
        done
    fi
else
    echo -e "${RED}❌ Validation endpoint not accessible${NC}"
fi
echo ""

# Step 2: Test OAuth flow
echo -e "${BLUE}Step 2: Testing OAuth flow...${NC}"

OAUTH_TEST=$(curl -s -I "https://photo-calendar.vercel.app/api/auth/signin/google" 2>&1)
if echo "$OAUTH_TEST" | grep -q "Location:.*error=google"; then
    echo -e "${RED}❌ OAuth flow failing with Google error${NC}"
    ERROR_URL=$(echo "$OAUTH_TEST" | grep "Location:" | cut -d' ' -f2)
    echo "   Error redirect: $ERROR_URL"
    echo ""
    echo -e "${YELLOW}This indicates a configuration issue. Common causes:${NC}"
    echo "   1. Google Client ID/Secret mismatch"
    echo "   2. Redirect URI not configured in Google Console"
    echo "   3. Environment variables have trailing spaces/newlines"
    echo "   4. Google Console project not properly configured"
elif echo "$OAUTH_TEST" | grep -q "Location:.*accounts.google.com"; then
    echo -e "${GREEN}✅ OAuth flow working (redirects to Google)${NC}"
else
    echo -e "${YELLOW}⚠️  Unexpected OAuth response${NC}"
    echo "$OAUTH_TEST"
fi
echo ""

# Step 3: Environment variable verification
echo -e "${BLUE}Step 3: Environment Variable Checklist${NC}"
echo "Required Vercel environment variables:"
echo ""

cat << 'EOF'
1. NEXTAUTH_URL
   ✅ Value: https://photo-calendar.vercel.app
   ❌ Common issues: trailing slash, http instead of https, whitespace

2. GOOGLE_CLIENT_ID  
   ✅ Value: 631982529712-ehmbs1abm3892pkphoivbbn9v39oia68.apps.googleusercontent.com
   ❌ Common issues: wrong client ID, missing .apps.googleusercontent.com

3. GOOGLE_CLIENT_SECRET
   ✅ Format: GOCSPX-[random string]
   ❌ Common issues: wrong secret, spaces/newlines

4. NEXTAUTH_SECRET
   ✅ Length: 32+ characters
   ❌ Common issues: too short, not set
EOF
echo ""

# Step 4: Google Console Configuration
echo -e "${BLUE}Step 4: Google Console Configuration Checklist${NC}"
echo ""
cat << 'EOF'
Google Cloud Console (console.cloud.google.com):
📋 Project: Your project should be selected

APIs & Services > Credentials:
📋 OAuth 2.0 Client ID should exist with:

   Authorized JavaScript origins:
   ✅ https://photo-calendar.vercel.app

   Authorized redirect URIs:
   ✅ https://photo-calendar.vercel.app/api/auth/callback/google

   Client ID: 631982529712-ehmbs1abm3892pkphoivbbn9v39oia68.apps.googleusercontent.com
   Client Secret: GOCSPX-[your-secret]

APIs & Services > OAuth consent screen:
📋 App should be configured with:
   - App name: Photo Calendar
   - User support email: your email
   - Developer contact information: your email
   - Publishing status: In production (or Testing with test users)
EOF
echo ""

# Step 5: Fix Commands
echo -e "${BLUE}Step 5: Fix Commands${NC}"
echo ""
echo "If issues are found, run these commands to fix them:"
echo ""

cat << 'EOF'
# Set correct environment variables in Vercel:
vercel env add NEXTAUTH_URL production
# Enter: https://photo-calendar.vercel.app

vercel env add GOOGLE_CLIENT_ID production  
# Enter: 631982529712-ehmbs1abm3892pkphoivbbn9v39oia68.apps.googleusercontent.com

vercel env add GOOGLE_CLIENT_SECRET production
# Enter: GOCSPX-[your-actual-secret-from-google-console]

vercel env add NEXTAUTH_SECRET production
# Enter: [generate-a-random-32+-character-string]

# Redeploy to apply changes:
vercel --prod
EOF
echo ""

# Step 6: Testing after fix
echo -e "${BLUE}Step 6: Testing Instructions${NC}"
echo ""
echo "After applying fixes:"
echo "1. Wait for deployment to complete"
echo "2. Test OAuth flow: https://photo-calendar.vercel.app/auth/signin"
echo "3. Check for errors: https://photo-calendar.vercel.app/api/auth/validate-config"
echo "4. Monitor logs: vercel logs https://photo-calendar.vercel.app --follow"
echo ""

# Step 7: Generate random secret if needed
echo -e "${BLUE}Step 7: Generate NextAuth Secret${NC}"
echo ""
echo "If you need a new NEXTAUTH_SECRET, use this random string:"
RANDOM_SECRET=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-32)
echo "NEXTAUTH_SECRET: $RANDOM_SECRET"
echo ""

echo -e "${GREEN}=== Fix Script Complete ===${NC}"
echo ""
echo -e "${YELLOW}Summary of most common fixes:${NC}"
echo "1. Remove trailing slash from NEXTAUTH_URL"
echo "2. Verify GOOGLE_CLIENT_ID matches Google Console exactly"
echo "3. Check GOOGLE_CLIENT_SECRET for whitespace/newlines"
echo "4. Ensure redirect URI is configured in Google Console"
echo "5. Redeploy after environment variable changes"
echo ""
echo "Need help? Check the validation endpoint for specific issues:"
echo "curl -s 'https://photo-calendar.vercel.app/api/auth/validate-config' -H 'x-debug-secret: [your-secret]' | jq"