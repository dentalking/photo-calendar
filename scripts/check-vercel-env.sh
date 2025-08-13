#!/bin/bash

echo "=== Checking Vercel Environment Variables ==="
echo ""

# Check if vercel CLI is available
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it with: npm i -g vercel"
    exit 1
fi

echo "Fetching environment variables from Vercel..."
echo ""

# Get environment variables from Vercel production
echo "Production Environment Variables:"
echo "=================================="

# Check NEXTAUTH_URL
echo "NEXTAUTH_URL:"
vercel env ls | grep "NEXTAUTH_URL" || echo "  Not found"
echo ""

# Check GOOGLE_CLIENT_ID
echo "GOOGLE_CLIENT_ID:"
vercel env ls | grep "GOOGLE_CLIENT_ID" || echo "  Not found"
echo ""

# Check GOOGLE_CLIENT_SECRET
echo "GOOGLE_CLIENT_SECRET:"
vercel env ls | grep "GOOGLE_CLIENT_SECRET" || echo "  Not found"
echo ""

# Check NEXTAUTH_SECRET
echo "NEXTAUTH_SECRET:"
vercel env ls | grep "NEXTAUTH_SECRET" || echo "  Not found"
echo ""

echo "Expected Configuration:"
echo "======================"
echo "NEXTAUTH_URL: https://photo-calendar.vercel.app (no trailing slash)"
echo "GOOGLE_CLIENT_ID: 631982529712-ehmbs1abm3892pkphoivbbn9v39oia68.apps.googleusercontent.com"
echo "GOOGLE_CLIENT_SECRET: [HIDDEN]"
echo "NEXTAUTH_SECRET: [HIDDEN]"
echo ""

echo "Next Steps:"
echo "1. Verify the environment variables match exactly"
echo "2. Check for any trailing spaces or newlines"
echo "3. Ensure Google Console OAuth settings match:"
echo "   - Authorized redirect URIs: https://photo-calendar.vercel.app/api/auth/callback/google"
echo "   - Authorized JavaScript origins: https://photo-calendar.vercel.app"
echo ""