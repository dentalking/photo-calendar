#!/bin/bash

echo "🚀 Photo Calendar Setup Script"
echo "=============================="

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cp .env.example .env.local 2>/dev/null || echo "⚠️  No .env.example found"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start Docker containers
echo "🐳 Starting Docker containers..."
docker compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Run Prisma migrations
echo "🗄️  Running database migrations..."
export DATABASE_URL="postgresql://postgres:password@localhost:5432/photo_calendar"
npx prisma migrate dev --name init

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Setup Google Cloud credentials
echo "🔑 Setting up Google Cloud credentials..."
node scripts/setup-google-credentials.js

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your API keys to .env.local:"
echo "   - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
echo "   - KAKAO_CLIENT_ID and KAKAO_CLIENT_SECRET"
echo "   - OPENAI_API_KEY"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Access the application at:"
echo "   http://localhost:3003"