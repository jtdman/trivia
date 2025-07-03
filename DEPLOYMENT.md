# Production Deployment Guide - Hetzner Server

This guide covers deploying the Trivia Nearby app to a production-ready Hetzner server with automatic deployment.

## Prerequisites

- Hetzner Cloud account
- Domain name with DNS access
- GitHub repository
- Local SSH key pair

## Phase 1: Server Setup & Security

### 1.1 Create Hetzner Server

1. Log into Hetzner Cloud Console
2. Create new project: "trivia-production"
3. Create server:
   - **Image**: Ubuntu 22.04 LTS
   - **Type**: CPX11 (2 vCPU, 4GB RAM) - sufficient for small-medium traffic
   - **Location**: Choose closest to your users
   - **SSH Key**: Upload your public key
   - **Name**: trivia-prod
4. Note the server IP address

### 1.2 Initial Server Connection

```bash
# Connect to server
ssh root@YOUR_SERVER_IP

# Update system packages
apt update && apt upgrade -y

# Set timezone (adjust as needed)
timedatectl set-timezone America/New_York
```

### 1.3 Create Non-Root User

```bash
# Create deployment user
adduser deploy
usermod -aG sudo deploy

# Set up SSH for deploy user
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Test connection as deploy user
# ssh deploy@YOUR_SERVER_IP
```

### 1.4 Security Hardening

```bash
# Configure SSH (as root)
nano /etc/ssh/sshd_config

# Make these changes:
# Port 2222                    # Change SSH port
# PermitRootLogin no           # Disable root login
# PasswordAuthentication no    # Disable password auth
# PubkeyAuthentication yes     # Enable key auth only

# Restart SSH
systemctl restart sshd

# Install and configure UFW firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 2222/tcp  # SSH (your custom port)
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable

# Install fail2ban for intrusion prevention
apt install fail2ban -y

# Configure fail2ban
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 2222
logpath = /var/log/auth.log
EOF

systemctl enable fail2ban
systemctl start fail2ban
```

### 1.5 Install Required Software

```bash
# Switch to deploy user
su - deploy

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
sudo npm install -g pnpm

# Install Nginx
sudo apt install nginx -y
sudo systemctl enable nginx

# Install Certbot for SSL certificates
sudo apt install certbot python3-certbot-nginx -y

# Install Git
sudo apt install git -y
```

## Phase 2: Application Setup

### 2.1 Set Up Application Directory

```bash
# Create app directory
sudo mkdir -p /var/www/trivia
sudo chown deploy:deploy /var/www/trivia

# Clone repository
cd /var/www/trivia
git clone https://github.com/jtdman/trivia.git .

# Create deployment branch
git checkout -b deployment
git push -u origin deployment

# Install dependencies and build
cd trivia-nearby
pnpm install
```

### 2.2 Environment Configuration

```bash
# Create production environment file
cd /var/www/trivia/trivia-nearby
cp .env.example .env.production

# Edit environment variables
nano .env.production
```

Add your production environment variables:
```env
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_anon_key
```

### 2.3 Build Application

```bash
# Build for production
cd /var/www/trivia/trivia-nearby
pnpm build

# Verify build output
ls -la dist/
```

## Phase 3: Web Server Configuration

### 3.1 Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/trivia
```

Add this configuration (replace `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    root /var/www/trivia/trivia-nearby/dist;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
    
    # Handle client routing (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security
    location ~ /\. {
        deny all;
    }
    
    # Logging
    access_log /var/log/nginx/trivia_access.log;
    error_log /var/log/nginx/trivia_error.log;
}
```

### 3.2 Enable Site

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/trivia /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Phase 4: Domain & SSL Setup

### 4.1 Configure DNS

In your domain registrar's DNS settings:

```
Type    Name    Value               TTL
A       @       YOUR_SERVER_IP      300
A       www     YOUR_SERVER_IP      300
```

Wait for DNS propagation (use `dig yourdomain.com` to verify).

### 4.2 Set Up SSL Certificate

```bash
# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run

# Add to crontab for automatic renewal
sudo crontab -e
# Add this line:
# 0 3 * * * /usr/bin/certbot renew --quiet
```

## Phase 5: Automatic Deployment Setup

### 5.1 Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml` in your repository:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ deployment ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        
    - name: Setup pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8
        
    - name: Install dependencies
      run: |
        cd trivia-nearby
        pnpm install
        
    - name: Build application
      run: |
        cd trivia-nearby
        pnpm build
        
    - name: Deploy to server
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.PRIVATE_KEY }}
        port: ${{ secrets.PORT }}
        script: |
          cd /var/www/trivia
          git fetch origin
          git checkout deployment
          git pull origin deployment
          cd trivia-nearby
          pnpm install
          pnpm build
          sudo systemctl reload nginx
```

### 5.2 Configure GitHub Secrets

In your GitHub repository settings > Secrets and variables > Actions, add:

- `HOST`: Your server IP address
- `USERNAME`: `deploy`
- `PRIVATE_KEY`: Your private SSH key content
- `PORT`: `2222` (or your SSH port)

### 5.3 Set Up SSH Key for GitHub Actions

```bash
# Generate a new SSH key pair for GitHub Actions
ssh-keygen -t ed25519 -f ~/.ssh/github_actions -N ""

# Add public key to authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys

# Copy private key for GitHub secrets
cat ~/.ssh/github_actions
# Copy this output to GitHub secrets as PRIVATE_KEY
```

## Phase 6: Monitoring & Maintenance

### 6.1 Set Up Log Rotation

```bash
# Configure logrotate for Nginx
sudo nano /etc/logrotate.d/nginx
```

Ensure it contains:
```
/var/log/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    prerotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```

### 6.2 Set Up Basic Monitoring

```bash
# Install htop for system monitoring
sudo apt install htop -y

# Create simple health check script
cat > /home/deploy/health-check.sh << 'EOF'
#!/bin/bash
curl -s -o /dev/null -w "%{http_code}" http://localhost/ > /tmp/health.status
if [ $(cat /tmp/health.status) != "200" ]; then
    echo "Site down! Status: $(cat /tmp/health.status)" | mail -s "Trivia Site Alert" your-email@domain.com
fi
EOF

chmod +x /home/deploy/health-check.sh

# Add to crontab (run every 5 minutes)
crontab -e
# Add: */5 * * * * /home/deploy/health-check.sh
```

## Phase 7: Deployment Workflow

### 7.1 Development to Production Process

1. **Develop locally** on `main` branch
2. **Test changes** thoroughly
3. **Merge to deployment branch**:
   ```bash
   git checkout deployment
   git merge main
   git push origin deployment
   ```
4. **GitHub Actions automatically deploys** to production
5. **Verify deployment** at your domain

### 7.2 Rollback Process

If something goes wrong:

```bash
# SSH to server
ssh deploy@YOUR_SERVER_IP -p 2222

# Go to app directory
cd /var/www/trivia

# Check git log for last good commit
git log --oneline -10

# Rollback to previous commit
git checkout PREVIOUS_COMMIT_HASH

# Rebuild
cd trivia-nearby
pnpm build

# Reload Nginx
sudo systemctl reload nginx
```

## Security Checklist

- [ ] SSH uses key authentication only
- [ ] SSH runs on non-standard port
- [ ] UFW firewall configured
- [ ] Fail2ban active
- [ ] SSL certificate installed
- [ ] Security headers configured
- [ ] Regular backups scheduled
- [ ] Log monitoring set up

## Performance Optimization

- [ ] Gzip compression enabled
- [ ] Static asset caching configured
- [ ] CDN configured (optional)
- [ ] Database queries optimized
- [ ] Image optimization

## Backup Strategy

Create automated backups:

```bash
# Create backup script
cat > /home/deploy/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/deploy/backups"
mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/trivia_app_$DATE.tar.gz /var/www/trivia

# Keep only last 7 days of backups
find $BACKUP_DIR -name "trivia_app_*.tar.gz" -mtime +7 -delete
EOF

chmod +x /home/deploy/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/deploy/backup.sh
```

Your trivia app will now be deployed at `https://yourdomain.com` with automatic updates when you push to the `deployment` branch!