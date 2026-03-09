#!/bin/bash
set -e
echo "🚀 Setting up Video Downloader Platform..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required. Install from https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm required."; exit 1; }

echo "📦 Installing dependencies..."
npm install

echo "📋 Setting up environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  Created .env from .env.example — please update with your values!"
fi

if [ ! -f frontend/.env.local ]; then
  cp .env.local.example frontend/.env.local
  echo "  Created frontend/.env.local from .env.local.example"
fi

echo "🗄️  Generating Prisma client..."
cd backend && npx prisma generate && cd ..

echo "📊 Running database migrations..."
cd backend && npx prisma migrate dev --name init && cd ..

echo "🌱 Seeding database..."
npm run db:seed

echo "✅ Setup complete!"
echo ""
echo "To start development:"
echo "  npm run dev"
echo ""
echo "To build for production:"
echo "  npm run build"
echo "  npm start (uses PM2)"
