#!/bin/bash

# Safe nginx restart script
echo "🔍 Checking nginx status..."

ssh trivia << 'EOF'
  echo "Current nginx status:"
  systemctl is-active nginx
  
  echo "Testing nginx config..."
  sudo nginx -t
  
  if [ $? -eq 0 ]; then
    echo "✅ Nginx config is valid"
    echo "🔄 Performing graceful reload..."
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
  else
    echo "❌ Nginx config has errors - NOT restarting"
    exit 1
  fi
EOF

echo "🎉 Nginx restart completed safely!"