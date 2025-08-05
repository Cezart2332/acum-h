# 🔧 Backend Fixes for Coolify Deployment

## Issue: 404 Error on https://api.acoomh.ro/health

Your API is giving 404 errors because of conflicts between Traefik (reverse proxy) and your backend HTTPS settings.

## 🛠️ Required Changes in Your Backend Repository

### 1. Update Program.cs - Disable HTTPS Redirection

```csharp
// BEFORE (causing infinite redirects):
app.UseHttpsRedirection();

// AFTER (comment out or remove):
// app.UseHttpsRedirection(); // Disabled - Traefik handles HTTPS
```

### 2. Update JWT Configuration

```csharp
// BEFORE:
options.RequireHttpsMetadata = true;

// AFTER:
options.RequireHttpsMetadata = false; // Allow HTTP when behind reverse proxy
```

### 3. Ensure Health Endpoints Exist

Make sure these endpoints are in your Program.cs:

```csharp
// Health check endpoints
app.MapGet("/health", () => new { 
    status = "healthy", 
    timestamp = DateTime.UtcNow,
    environment = app.Environment.EnvironmentName 
});

app.MapGet("/health/db", async (AppDbContext context) =>
{
    try
    {
        await context.Database.CanConnectAsync();
        var migrations = await context.Database.GetAppliedMigrationsAsync();
        return Results.Ok(new { 
            status = "database connected", 
            migrationsApplied = migrations.Count(),
            timestamp = DateTime.UtcNow 
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Database connection failed: {ex.Message}");
    }
});
```

### 4. Server URL Configuration

Make sure your backend listens on the correct port:

```csharp
// For Coolify deployment
if (!app.Environment.IsDevelopment())
{
    app.Urls.Add("http://0.0.0.0:8080");
}
```

## 🚀 Quick Fix Steps

1. **In your backend repository**, make these changes to Program.cs
2. **Commit and push** to trigger Coolify redeploy
3. **Wait 2-3 minutes** for deployment
4. **Test**: `https://api.acoomh.ro/health`

## 🧪 Test After Deployment

```bash
# Should return 200 OK with JSON response
curl https://api.acoomh.ro/health

# Should return database status
curl https://api.acoomh.ro/health/db
```

## 📱 Mobile App Configuration

Once your backend is fixed, your mobile app should work with:

```env
EXPO_PUBLIC_BACKEND_BASE_URL=https://api.acoomh.ro
```

## 🔍 Debugging

If still not working, check Coolify logs for:
- Application startup errors
- Port binding issues
- Database connection problems
- Environment variable configuration

The main issue was that both Traefik and your backend were trying to handle HTTPS redirects, causing conflicts.
