# 🚀 AcoomH Production Deployment Guide

## 📋 PRE-DEPLOYMENT CHECKLIST

### 🔒 Security Configuration

- [ ] **JWT Secrets**: Generate and set production JWT secrets (min 256-bit)
- [ ] **Database Credentials**: Use strong production database passwords
- [ ] **SSL Certificates**: Install valid SSL certificates for production domain
- [ ] **Certificate Pinning**: Update mobile app with production certificate hashes
- [ ] **API Keys**: Rotate all API keys to production values
- [ ] **CORS Origins**: Restrict to production domains only
- [ ] **Rate Limiting**: Configure for production traffic patterns

### 🛢️ Database Migration

```bash
# Apply all pending migrations
cd backend/WebApplication1/WebApplication1
dotnet ef database update

# Verify migration status
dotnet ef migrations list
```

### 📱 Mobile App Configuration

```bash
# Install security dependencies
npm install

# Configure production environment
cp .env.production .env.local

# Build production app
eas build --platform all --profile production
```

### 🖥️ Backend Configuration

```bash
# Set production environment
export ASPNETCORE_ENVIRONMENT=Production

# Update connection strings
# Update appsettings.Production.json

# Build and publish
dotnet publish -c Release -o ./publish
```

---

## 🌐 PRODUCTION ENVIRONMENT SETUP

### SSL Certificate Installation

```bash
# For nginx reverse proxy
sudo cp certificate.crt /etc/ssl/certs/acoomh.crt
sudo cp private.key /etc/ssl/private/acoomh.key

# Update nginx configuration
sudo nano /etc/nginx/sites-available/acoomh
sudo nginx -t
sudo systemctl reload nginx
```

### Database Security

```sql
-- Create production database user
CREATE USER 'acoomh_prod'@'%' IDENTIFIED BY 'complex_production_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON acoomh_prod.* TO 'acoomh_prod'@'%';
FLUSH PRIVILEGES;

-- Enable SSL connections
-- Ensure MySQL is configured with SSL certificates
```

### Environment Variables

```bash
# Backend environment variables
export ConnectionStrings__DefaultConnection="Server=prod-db;Database=acoomh_prod;Uid=acoomh_prod;Pwd=secure_password;SslMode=Required;"
export JwtSettings__SecretKey="production_jwt_secret_256_bit_minimum"
export JwtSettings__Issuer="https://api.acoomh.ro"
export JwtSettings__Audience="https://acoomh.ro"

# Mobile app environment variables
EXPO_PUBLIC_API_BASE_URL=https://api.acoomh.ro
EXPO_PUBLIC_SSL_PIN_PRIMARY=sha256/primary_certificate_hash
EXPO_PUBLIC_SSL_PIN_BACKUP=sha256/backup_certificate_hash
```

---

## 🔧 INFRASTRUCTURE SETUP

### Docker Deployment

```dockerfile
# Dockerfile for backend
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY publish/ .
EXPOSE 80 443
ENTRYPOINT ["dotnet", "WebApplication1.dll"]
```

```yaml
# docker-compose.yml
version: "3.8"
services:
  acoomh-api:
    build: ./backend
    ports:
      - "5000:80"
      - "5001:443"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=${CONNECTION_STRING}
    depends_on:
      - database

  database:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: acoomh_prod
      MYSQL_USER: acoomh_prod
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - db_data:/var/lib/mysql
      - ./ssl:/etc/mysql/ssl
    ports:
      - "3306:3306"
    command: --require-secure-transport=ON

volumes:
  db_data:
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.acoomh.ro;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.acoomh.ro;

    ssl_certificate /etc/ssl/certs/acoomh.crt;
    ssl_certificate_key /etc/ssl/private/acoomh.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 📊 MONITORING SETUP

### Application Monitoring

```json
// appsettings.Production.json
{
  "Serilog": {
    "Using": ["Serilog.Sinks.File", "Serilog.Sinks.Console"],
    "MinimumLevel": "Information",
    "WriteTo": [
      {
        "Name": "File",
        "Args": {
          "path": "/var/log/acoomh/app-.log",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 30
        }
      },
      {
        "Name": "Console"
      }
    ]
  }
}
```

### Health Checks

```csharp
// In Program.cs - already configured
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});
```

### Metrics Collection

```bash
# Install monitoring tools
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  prom/prometheus

docker run -d \
  --name grafana \
  -p 3000:3000 \
  grafana/grafana
```

---

## 🔐 SECURITY VALIDATION

### SSL Configuration Test

```bash
# Test SSL configuration
curl -I https://api.acoomh.ro/health

# SSL Labs test
curl -s "https://api.ssllabs.com/api/v3/analyze?host=api.acoomh.ro" | jq .
```

### Security Headers Validation

```bash
# Check security headers
curl -I https://api.acoomh.ro | grep -E "(Strict-Transport-Security|X-Content-Type-Options|X-Frame-Options)"
```

### Authentication Testing

```bash
# Test JWT authentication
curl -X POST https://api.acoomh.ro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@acoomh.ro","password":"TestPassword123!"}'

# Test protected endpoint
curl -H "Authorization: Bearer <jwt_token>" \
  https://api.acoomh.ro/api/users/profile
```

---

## 📱 MOBILE APP DEPLOYMENT

### EAS Build Configuration

```json
// eas.json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.acoomh.ro",
        "EXPO_PUBLIC_SSL_PIN_PRIMARY": "sha256/production_cert_hash",
        "EXPO_PUBLIC_SSL_PIN_BACKUP": "sha256/backup_cert_hash"
      },
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      },
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Build Commands

```bash
# Login to EAS
eas login

# Build for production
eas build --platform all --profile production

# Submit to app stores
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

---

## 🚨 INCIDENT RESPONSE PROCEDURES

### Immediate Response

1. **Identify the Issue**: Monitor logs, alerts, and user reports
2. **Assess Impact**: Determine scope and severity
3. **Contain the Problem**: Isolate affected systems
4. **Document Everything**: Log all actions and decisions

### Communication Plan

```markdown
## Incident Communication Template

**Incident ID**: INC-YYYYMMDD-XXX
**Severity**: Critical/High/Medium/Low
**Status**: Investigating/Identified/Monitoring/Resolved
**Impact**: Service disruption details
**Timeline**: Key events and actions
**Next Update**: When next update will be provided

### Current Status

[Detailed status information]

### Actions Taken

- [Action 1]
- [Action 2]

### Next Steps

- [Next action]
- [Timeline]
```

### Recovery Procedures

```bash
# Rollback deployment
kubectl rollout undo deployment/acoomh-api

# Scale up replicas
kubectl scale deployment acoomh-api --replicas=3

# Check health
kubectl get pods -l app=acoomh-api
curl https://api.acoomh.ro/health
```

---

## 📈 PERFORMANCE OPTIMIZATION

### Database Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_users_email ON Users(Email);
CREATE INDEX idx_locations_company_id ON Locations(CompanyId);
CREATE INDEX idx_events_location_id ON Events(LocationId);
CREATE INDEX idx_events_date ON Events(EventDate);
```

### Caching Strategy

```csharp
// Redis configuration in Program.cs
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
});
```

### CDN Configuration

```nginx
# Static assets caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header X-Content-Type-Options nosniff;
}
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

### Functional Testing

- [ ] User registration and login
- [ ] Location creation and management
- [ ] Event creation and booking
- [ ] Payment processing
- [ ] Push notifications
- [ ] Search functionality

### Performance Testing

- [ ] API response times < 500ms (95th percentile)
- [ ] Database query performance
- [ ] Mobile app startup time < 3 seconds
- [ ] Memory usage within limits
- [ ] CPU utilization under load

### Security Testing

- [ ] SSL/TLS configuration
- [ ] Authentication flows
- [ ] Authorization controls
- [ ] Input validation
- [ ] Rate limiting
- [ ] Security headers

### Monitoring Verification

- [ ] Log aggregation working
- [ ] Metrics collection active
- [ ] Alert rules configured
- [ ] Dashboard accessibility
- [ ] Backup procedures tested

---

## 📞 SUPPORT CONTACTS

### Technical Team

- **DevOps Lead**: devops@acoomh.ro
- **Security Team**: security@acoomh.ro
- **Backend Team**: backend@acoomh.ro
- **Mobile Team**: mobile@acoomh.ro

### Emergency Escalation

1. **Level 1**: Development Team (15 minutes)
2. **Level 2**: Technical Lead (30 minutes)
3. **Level 3**: CTO/Engineering Manager (1 hour)

### External Vendors

- **Cloud Provider**: AWS/Azure Support
- **SSL Certificate**: Certificate Authority Support
- **Payment Gateway**: Stripe/PayPal Support

---

_Deployment Date: ******\_\_\_******_
_Deployed By: ********\_\_\_********_
_Verified By: ********\_\_\_********_
