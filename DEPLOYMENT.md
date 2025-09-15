# Deployment Guide for Recykle-Naija Backend

This guide covers deploying the Recykle-Naija backend to Render.com with all necessary configurations.

## 🚀 Pre-deployment Checklist

### 1. Database Setup (Neon PostgreSQL)
1. Create account at [Neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string (DATABASE_URL)
4. Note down the database credentials

### 2. External Services Setup
- **Email Service**: Gmail SMTP or SendGrid
- **SMS Service**: Termii account for Nigerian SMS
- **File Storage**: Cloudinary account
- **Payment**: Paystack account (Nigerian payment gateway)

### 3. Environment Variables
Prepare all environment variables from `.env.example`

## 🌐 Render.com Deployment Steps

### Step 1: Create Render Account
1. Go to [Render.com](https://render.com)
2. Sign up with GitHub account
3. Connect your repository

### Step 2: Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure the service:

```yaml
Name: recykle-naija-api
Environment: Node
Region: Oregon (US West) or Frankfurt (EU Central)
Branch: main
Build Command: npm install
Start Command: npm start
```

### Step 3: Environment Variables Configuration
Add these environment variables in Render dashboard:

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# JWT
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-characters
JWT_EXPIRES_IN=7d

# Server
NODE_ENV=production
PORT=10000

# Email Service (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@recykle-naija.com

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Paystack (Nigerian Payment Gateway)
PAYSTACK_SECRET_KEY=sk_live_your-paystack-secret-key
PAYSTACK_PUBLIC_KEY=pk_live_your-paystack-public-key

# SMS Service (Termii - Nigerian SMS)
TERMII_API_KEY=your-termii-api-key
TERMII_SENDER_ID=RecykleNG

# Google Maps (for location services)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# App URLs
FRONTEND_URL=https://your-frontend-domain.com
BACKEND_URL=https://your-render-app.onrender.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 4: Advanced Settings
```yaml
Auto-Deploy: Yes
Health Check Path: /health
```

### Step 5: Deploy
1. Click "Create Web Service"
2. Wait for deployment to complete
3. Check logs for any errors

## 📋 Post-Deployment Setup

### 1. Database Migration
After successful deployment, run database migrations:

```bash
# SSH into your Render service or use Render Shell
npm run migrate
```

### 2. Seed Database
```bash
npm run seed
```

### 3. Test API Endpoints
Test the health endpoint:
```
GET https://your-app.onrender.com/health
```

### 4. Verify Email Templates
Check if email templates are initialized:
```
GET https://your-app.onrender.com/api/system/health
```

## 🔧 Production Optimizations

### 1. Add Custom Domain (Optional)
1. Go to Settings → Custom Domains
2. Add your domain
3. Configure DNS records

### 2. Enable HTTPS
Render automatically provides SSL certificates for custom domains.

### 3. Set up Monitoring
Add monitoring services like:
- **Uptime monitoring**: UptimeRobot
- **Error tracking**: Sentry
- **Performance monitoring**: New Relic

### 4. Configure Logging
Render automatically captures logs. Access them via:
- Render Dashboard → Logs
- Or use log aggregation services

## 🚨 Troubleshooting

### Common Issues:

1. **Build Failures**
   ```bash
   # Check package.json scripts
   # Ensure all dependencies are in package.json
   # Check Node.js version compatibility
   ```

2. **Database Connection Issues**
   ```bash
   # Verify DATABASE_URL format
   # Check Neon database status
   # Ensure IP whitelist includes Render IPs
   ```

3. **Environment Variables**
   ```bash
   # Double-check all required variables
   # Ensure no trailing spaces
   # Verify special characters are properly escaped
   ```

4. **Memory Issues**
   ```bash
   # Upgrade to higher tier if needed
   # Optimize database queries
   # Implement proper caching
   ```

## 📊 Monitoring & Maintenance

### 1. Health Checks
Set up automated health checks:
```javascript
// Health check endpoint
GET /health
GET /api/system/health
```

### 2. Database Monitoring
- Monitor connection pool usage
- Track query performance
- Set up alerts for slow queries

### 3. Log Monitoring
```bash
# Access logs via Render dashboard
# Set up log alerts for errors
# Monitor API response times
```

### 4. Backup Strategy
```bash
# Automated daily backups via cron jobs
# Manual backup before major updates
npm run backup
```

## 🔄 CI/CD Pipeline

### GitHub Actions (Optional)
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Render

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Run tests
      run: npm test
      
    - name: Deploy to Render
      # Render auto-deploys on push to main
      run: echo "Deployment triggered"
```

## 📈 Scaling Considerations

### 1. Database Scaling
- Monitor connection limits
- Consider read replicas for heavy read operations
- Implement connection pooling

### 2. Application Scaling
- Use Render's auto-scaling features
- Implement caching (Redis)
- Optimize API endpoints

### 3. File Storage
- Use Cloudinary for image optimization
- Implement CDN for static assets
- Consider file size limits

## 🔐 Security Checklist

- [ ] All environment variables are secure
- [ ] JWT secrets are strong and unique
- [ ] Database credentials are rotated regularly
- [ ] API rate limiting is configured
- [ ] CORS is properly configured
- [ ] Input validation is implemented
- [ ] SQL injection protection is active
- [ ] XSS protection is enabled

## 📞 Support

For deployment issues:
1. Check Render documentation
2. Review application logs
3. Contact Render support
4. Check GitHub issues

---

**Deployment Complete!** 🎉

Your Recykle-Naija backend is now live and ready to serve requests. Monitor the health endpoints and logs to ensure everything is running smoothly.