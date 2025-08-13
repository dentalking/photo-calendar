#!/bin/bash

# Quick script to set correct environment variables in Vercel
# Run this script to apply the correct OAuth configuration

echo "=== Setting Vercel Environment Variables ==="
echo ""

# Check if vercel CLI is available
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it with: npm i -g vercel"
    exit 1
fi

echo "Setting production environment variables..."

# Set NEXTAUTH_URL (ensure no trailing slash)
echo "Setting NEXTAUTH_URL..."
echo "https://photo-calendar.vercel.app" | vercel env add NEXTAUTH_URL production

# Set GOOGLE_CLIENT_ID 
echo "Setting GOOGLE_CLIENT_ID..."
echo "631982529712-ehmbs1abm3892pkphoivbbn9v39oia68.apps.googleusercontent.com" | vercel env add GOOGLE_CLIENT_ID production

# Set GOOGLE_CLIENT_SECRET (you'll need to enter this manually)
echo "Setting GOOGLE_CLIENT_SECRET..."
echo "Please enter your Google Client Secret from Google Console (starts with GOCSPX-):"
vercel env add GOOGLE_CLIENT_SECRET production

# Generate and set NEXTAUTH_SECRET
echo "Generating NEXTAUTH_SECRET..."
NEXTAUTH_SECRET=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-32)
echo "Generated secret: $NEXTAUTH_SECRET"
echo "$NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET production

echo ""
echo "✅ Environment variables set!"
echo ""
echo "Next steps:"
echo "1. Redeploy the application: vercel --prod"
echo "2. Test OAuth: https://photo-calendar.vercel.app/auth/signin"
echo "3. Validate config: https://photo-calendar.vercel.app/api/auth/validate-config"
echo ""
echo "If OAuth still fails, verify Google Console settings:"
echo "- Authorized redirect URIs: https://photo-calendar.vercel.app/api/auth/callback/google"
echo "- Authorized JavaScript origins: https://photo-calendar.vercel.app"