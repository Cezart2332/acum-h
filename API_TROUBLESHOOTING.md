# 🔧 API Connection Troubleshooting Guide

## Current Issue: Infinite Redirect Loop

Your API at `api.acoomh.ro` is experiencing infinite redirects. Here are the solutions:

## 🚀 Quick Fixes to Try

### 1. Check Coolify Dashboard

- Go to your Coolify application
- Check "Domains & SSL" settings
- Temporarily disable "Force HTTPS redirect"
- Verify port mapping (should be 8080)

### 2. Alternative URLs to Test

Try these URL patterns in order:

```bash
# If you know your Coolify server IP:
http://YOUR_SERVER_IP:8080/health

# Coolify subdomain pattern:
http://app-name.your-coolify-domain.com/health

# Direct service name:
http://acoomh-api.your-coolify-domain.com/health
```

### 3. Update Environment Variables

Once you find a working URL, update `.env`:

```env
# Replace with working URL
EXPO_PUBLIC_BACKEND_BASE_URL=http://YOUR_WORKING_URL
```

## 🔍 Diagnostic Commands

Run these in your terminal to find the working URL:

```bash
# Test different ports
curl -I http://api.acoomh.ro:8080/health
curl -I http://api.acoomh.ro:3000/health
curl -I http://api.acoomh.ro:5000/health

# Check DNS resolution
nslookup api.acoomh.ro

# Check if service is running
telnet api.acoomh.ro 8080
```

## 🛠️ Coolify Configuration Check

In your Coolify dashboard, verify:

1. **Application Status**: Is it running?
2. **Logs**: Check for startup errors
3. **Environment Variables**: Are they set correctly?
4. **Domain Configuration**: Remove conflicting redirects
5. **SSL Settings**: Disable until working

## 📱 Mobile App Fallback

I've created a fallback system in the app that will try multiple URLs automatically.
