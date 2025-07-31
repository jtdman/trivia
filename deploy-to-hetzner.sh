#!/bin/bash

# Deployment script for Trivia app to Hetzner
echo "🚀 Starting deployment to Hetzner server..."

# Build locally first
echo "📦 Building trivia-nearby locally..."
cd trivia-nearby
pnpm install
pnpm build
cd ..

echo "✅ Local build complete!"

# Deploy to server
echo "🌐 Deploying to Hetzner server..."
ssh trivia << 'EOF'
  cd /var/www/trivia
  echo "📥 Pulling latest code..."
  git pull origin main
  
  echo "📦 Building on server..."
  cd trivia-nearby
  pnpm install
  pnpm build
  
  echo "🔄 Restarting services..."
  sudo systemctl restart nginx
  # Add PM2 restart if using PM2: pm2 restart trivia-app
  
  echo "✅ Deployment complete!"
EOF

echo "🎉 Deployment finished! Check https://trivianearby.com"