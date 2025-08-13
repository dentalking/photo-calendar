#!/bin/bash

# Test OAuth Configuration Script
# This script tests the Google OAuth configuration and identifies potential issues

echo "=== Google OAuth Configuration Test ==="
echo "Testing production deployment: https://photo-calendar.vercel.app"
echo ""

# Test 1: Check if debug endpoint is accessible
echo "1. Testing debug endpoint..."
curl -s "https://photo-calendar.vercel.app/api/auth/debug" | jq '.' > /tmp/debug_output.json
if [ $? -eq 0 ]; then
    echo "✅ Debug endpoint accessible"
    
    # Check for critical configuration issues
    HAS_NEXTAUTH_URL=$(jq -r '.environment.hasNextAuthUrl' /tmp/debug_output.json)
    HAS_GOOGLE_CLIENT_ID=$(jq -r '.environment.hasGoogleClientId' /tmp/debug_output.json)
    HAS_GOOGLE_CLIENT_SECRET=$(jq -r '.environment.hasGoogleClientSecret' /tmp/debug_output.json)
    NEXTAUTH_URL=$(jq -r '.environment.nextAuthUrl' /tmp/debug_output.json)
    
    echo "   - NextAuth URL set: $HAS_NEXTAUTH_URL ($NEXTAUTH_URL)"
    echo "   - Google Client ID set: $HAS_GOOGLE_CLIENT_ID"
    echo "   - Google Client Secret set: $HAS_GOOGLE_CLIENT_SECRET"
else
    echo "❌ Debug endpoint not accessible"
fi
echo ""

# Test 2: Check OAuth debug endpoint
echo "2. Testing OAuth debug endpoint..."
curl -s "https://photo-calendar.vercel.app/api/auth/oauth-debug" | jq '.' > /tmp/oauth_debug.json
if [ $? -eq 0 ]; then
    echo "✅ OAuth debug endpoint accessible"
    
    STATUS=$(jq -r '.status' /tmp/oauth_debug.json)
    ISSUES=$(jq -r '.summary.totalIssues' /tmp/oauth_debug.json)
    
    echo "   - Configuration Status: $STATUS"
    echo "   - Issues Detected: $ISSUES"
    
    if [ "$ISSUES" != "0" ]; then
        echo "   - Issues found:"
        jq -r '.issues[] | "     * " + .issue + ": " + .solution' /tmp/oauth_debug.json
    fi
else
    echo "❌ OAuth debug endpoint not accessible"
fi
echo ""

# Test 3: Test NextAuth configuration endpoint
echo "3. Testing NextAuth configuration..."
curl -s "https://photo-calendar.vercel.app/api/auth/providers" | jq '.' > /tmp/providers.json
if [ $? -eq 0 ]; then
    echo "✅ Providers endpoint accessible"
    
    GOOGLE_PROVIDER=$(jq -r '.google.id' /tmp/providers.json)
    if [ "$GOOGLE_PROVIDER" = "google" ]; then
        echo "   - Google provider configured: ✅"
        
        # Check authorization URL
        AUTH_URL=$(jq -r '.google.authorizationUrl' /tmp/providers.json)
        echo "   - Authorization URL: $AUTH_URL"
    else
        echo "   - Google provider configured: ❌"
    fi
else
    echo "❌ Providers endpoint not accessible"
fi
echo ""

# Test 4: Test actual OAuth initiation
echo "4. Testing OAuth initiation..."
SIGNIN_RESPONSE=$(curl -s -I "https://photo-calendar.vercel.app/api/auth/signin/google")
if echo "$SIGNIN_RESPONSE" | grep -q "Location:"; then
    echo "✅ OAuth initiation works (redirect found)"
    
    REDIRECT_URL=$(echo "$SIGNIN_RESPONSE" | grep "Location:" | cut -d' ' -f2 | tr -d '\r')
    echo "   - Redirect URL: $REDIRECT_URL"
    
    # Check if redirect goes to Google
    if echo "$REDIRECT_URL" | grep -q "accounts.google.com"; then
        echo "   - Redirects to Google: ✅"
    else
        echo "   - Redirects to Google: ❌"
        echo "   - Unexpected redirect: $REDIRECT_URL"
    fi
else
    echo "❌ OAuth initiation failed (no redirect)"
    echo "Response:"
    echo "$SIGNIN_RESPONSE"
fi
echo ""

# Test 5: Check for common environment variable issues
echo "5. Testing for common configuration issues..."

# Test callback URL
CALLBACK_TEST=$(curl -s -o /dev/null -w "%{http_code}" "https://photo-calendar.vercel.app/api/auth/callback/google")
echo "   - Callback endpoint status: $CALLBACK_TEST"

# Test if NEXTAUTH_URL has trailing slash or whitespace
if [ -f /tmp/oauth_debug.json ]; then
    HAS_TRAILING_SLASH=$(jq -r '.validation.nextAuthUrl.hasTrailingSlash' /tmp/oauth_debug.json)
    HAS_WHITESPACE=$(jq -r '.validation.nextAuthUrl.hasNewlineOrSpaces' /tmp/oauth_debug.json)
    
    echo "   - NEXTAUTH_URL has trailing slash: $HAS_TRAILING_SLASH"
    echo "   - NEXTAUTH_URL has whitespace: $HAS_WHITESPACE"
    
    if [ "$HAS_TRAILING_SLASH" = "true" ] || [ "$HAS_WHITESPACE" = "true" ]; then
        echo "   ⚠️  Environment variable formatting issues detected!"
    fi
fi
echo ""

# Test 6: Validate Google Client ID format
echo "6. Validating Google Client ID format..."
if [ -f /tmp/oauth_debug.json ]; then
    CLIENT_ID_VALID=$(jq -r '.validation.googleClientId.format' /tmp/oauth_debug.json)
    CLIENT_ID_DOMAIN=$(jq -r '.validation.googleClientId.domain' /tmp/oauth_debug.json)
    
    echo "   - Google Client ID format valid: $CLIENT_ID_VALID"
    echo "   - Has .apps.googleusercontent.com domain: $CLIENT_ID_DOMAIN"
    
    if [ "$CLIENT_ID_VALID" != "true" ] || [ "$CLIENT_ID_DOMAIN" != "true" ]; then
        echo "   ❌ Google Client ID format issues detected!"
    fi
fi
echo ""

echo "=== Test Complete ==="
echo ""
echo "Next Steps:"
echo "1. Review the debug outputs above"
echo "2. Check /tmp/debug_output.json and /tmp/oauth_debug.json for detailed information"
echo "3. Fix any configuration issues identified"
echo "4. Verify Google Console settings match the expected URLs"
echo ""
echo "Debug files saved:"
echo "   - /tmp/debug_output.json"
echo "   - /tmp/oauth_debug.json"
echo "   - /tmp/providers.json"