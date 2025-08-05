#!/bin/bash
# Quick deployment script for Coolify

echo "🚀 Deploying backend fixes to Coolify..."

# Add all changes
git add .

# Commit with descriptive message
git commit -m "fix: resolve infinite redirect loop in Traefik setup

- Disable HTTPS redirection in backend (let Traefik handle it)
- Disable RequireHttpsMetadata for JWT behind reverse proxy
- Update API service to use HTTPS endpoint
- Add robust API connection fallback system
- Fix compatibility with Traefik SSL termination"

# Push to trigger Coolify deployment
git push origin main

echo "✅ Pushed to GitHub - Coolify should now redeploy automatically"
echo "🔍 Check your Coolify dashboard for deployment status"
echo "⏱️  Wait 2-3 minutes for deployment to complete"
echo "🧪 Then test: https://api.acoomh.ro/health"
