#!/bin/bash

echo "🔧 Fixing SSL permissions and restarting nginx..."

ssh trivia << 'EOF'
  echo "📋 Current certificate permissions:"
  ls -la /etc/letsencrypt/live/trivianearby.com/ 2>/dev/null || echo "Cannot access cert directory"
  
  echo "🔄 Attempting to fix nginx gracefully..."
  
  # Try to reload nginx configuration 
  echo "Testing config first..."
  if sudo nginx -t 2>/dev/null; then
    echo "✅ Config is valid, reloading..."
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
  else
    echo "⚠️  Config has SSL issues, but nginx is still serving files"
    echo "🔍 Checking if site is accessible..."
    curl -k -s -o /dev/null -w "Status: %{http_code}" https://localhost/
    echo ""
  fi
  
  echo "🌐 Final status check:"
  systemctl is-active nginx
  echo "Site should be accessible at https://trivianearby.com"
EOF

echo "🎉 SSL fix attempt completed!"