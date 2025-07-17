using WebApplication1.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Microsoft.AspNetCore.Http;    
using System.IO;                     
using System.Threading.Tasks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// Register only the single AppDbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

// Configure JSON options to serialize enums as strings
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.Urls.Clear();
app.Urls.Add("http://0.0.0.0:5298");

app.MapPost("/login", async (LoginRequest req, AppDbContext db) =>
{
    // First try to find a company
    var company = await db.Companies
        .FirstOrDefaultAsync(c => c.Name == req.Username || c.Email == req.Username);
    if (company != null && BCrypt.Net.BCrypt.Verify(req.Password, company.Password))
    {
        string pfpCompany = company.ProfileImage is not null
            ? Convert.ToBase64String(company.ProfileImage)
            : null;

        var response = new 
        {
            Type = "Company",
            Id = company.Id,
            Name = company.Name,
            Email = company.Email,
            Tags = company.Tags.Split(",").ToList(),
            Address = company.Address,
            Cui = company.Cui,
            Category = company.Category,
            ProfileImage = pfpCompany
        };
        return Results.Ok(response);
    }
    
    // Then try to find a user
    var user = await db.Users
        .FirstOrDefaultAsync(u => u.Username == req.Username || u.Email == req.Username);
    if (user != null && BCrypt.Net.BCrypt.Verify(req.Password, user.Password))
    {
        string pfpUser = user.ProfileImage is not null
            ? Convert.ToBase64String(user.ProfileImage)
            : null;

        var response = new 
        {
            Type = "User",
            Id = user.Id,
            Username = user.Username,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            ProfileImage = pfpUser
        };
        return Results.Ok(response);
    }
    
    return Results.Unauthorized();
});

app.MapPost("/companies", async (HttpRequest req, AppDbContext db) =>
{
    var form = await req.ReadFormAsync();
    var name  = form["name"].ToString();
    var email = form["email"].ToString();
    
    if (await db.Companies.AnyAsync(c => c.Name == name || c.Email == email))
        return Results.Conflict(new { Error = "Name or email already exists!" });

    var company = new Company
    {
        Name      = name,
        Email     = email,
        Address   = form["address"].ToString(),
        Description  = "",
        Latitude  = double.Parse(form["latitude"]),
        Longitude = double.Parse(form["longitude"]),
        Cui       = int.Parse(form["cui"]),
        Category  = form["category"].ToString(),
        Password  = BCrypt.Net.BCrypt.HashPassword(form["password"].ToString()),
        Tags = form["tags"].ToString(),
    };

    var file = form.Files.GetFile("default");
    if (file is not null && file.Length > 0)
    {
        using var ms = new MemoryStream();
        await file.OpenReadStream().CopyToAsync(ms);
        company.ProfileImage = ms.ToArray();
    }

    db.Companies.Add(company);
    await db.SaveChangesAsync();

    var response = new CompanyResponse
    {
        Id        = company.Id,
        Name      = company.Name,
        Email     = company.Email,
        Address   = company.Address,
        Description  = company.Description,
        Tags      = company.Tags.Split(",").ToList(),
        Latitude  = company.Latitude,
        Longitude = company.Longitude,
        Cui       = company.Cui,
        Category  = company.Category,
        ProfileImage = company.ProfileImage.Length > 0 
            ? Convert.ToBase64String(company.ProfileImage) 
            : null
    };

    return Results.Created($"/companies/{company.Id}", response);
});

app.MapPost("/events", async (HttpRequest req, AppDbContext db) =>
{
    var form = await req.ReadFormAsync();
    var file = form.Files.GetFile("file");
    
    var newEvent = new Event
    {
        Title = form["title"].ToString(),
        Description = form["description"].ToString(),
        Tags = form["tags"].ToString(),
        Likes = 0,
        CompanyId = int.Parse(form["companyId"].ToString()),
    };
    
    if (file != null && file.Length > 0)
    {
        using var ms = new MemoryStream();
        await file.OpenReadStream().CopyToAsync(ms);
        newEvent.Photo = ms.ToArray();
    }

    db.Events.Add(newEvent);
    await db.SaveChangesAsync();
    return Results.Created();
});

app.MapPut("changepfp", async (HttpRequest req, AppDbContext db) =>
{
    var form = await req.ReadFormAsync();
    int userId = int.Parse(form["id"]);
    var file = form.Files.GetFile("file");
    
    // First try to find a company
    var company = await db.Companies.FindAsync(userId);
    if (company != null)
    {
        if (file != null && file.Length > 0)
        {
            using var ms = new MemoryStream();
            await file.OpenReadStream().CopyToAsync(ms);
            company.ProfileImage = ms.ToArray();
        }
        await db.SaveChangesAsync();
        return Results.NoContent();
    }
    
    // Then try to find a user
    var user = await db.Users.FindAsync(userId);
    if (user != null)
    {
        if (file != null && file.Length > 0)
        {
            using var ms = new MemoryStream();
            await file.OpenReadStream().CopyToAsync(ms);
            user.ProfileImage = ms.ToArray();
        }
        await db.SaveChangesAsync();
        return Results.NoContent();
    }
    
    return Results.NotFound("User or company not found");
});

app.MapPut("description", async (HttpRequest req, AppDbContext db) =>
{
    var form = await req.ReadFormAsync();
    int id = int.Parse(form["id"]);
    var description = form["description"].ToString();
    
    var company = await db.Companies.FindAsync(id);
    if (company != null)
    {
        company.Description = description;
        await db.SaveChangesAsync();
        return Results.NoContent();
    }
    return Results.NotFound("Company not found");
});

app.MapGet("/events", async (AppDbContext db) =>
{
    var events = await db.Events
        .Include(e => e.Company)
        .ToListAsync();
    
    var eventResponses = events.Select(e => new EventResponse
    {
        Id = e.Id,
        Title = e.Title,
        Tags = e.Tags.Split(",").ToList(),
        Description = e.Description,
        Likes = e.Likes,
        Photo = Convert.ToBase64String(e.Photo),
        Company = e.Company?.Name ?? "Unknown"
    }).ToList();
    
    return Results.Ok(eventResponses);
});

app.MapGet("/events/{id}", async (int id, AppDbContext db) =>
{
    var eventItem = await db.Events
        .Include(e => e.Company)
        .FirstOrDefaultAsync(e => e.Id == id);

    if (eventItem is null)
        return Results.NotFound($"Event with ID {id} not found");

    var response = new EventResponse
    {
        Id = eventItem.Id,
        Photo = Convert.ToBase64String(eventItem.Photo),
        Title = eventItem.Title,
        Tags = eventItem.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
        Description = eventItem.Description,
        Likes = eventItem.Likes,
        Company = eventItem.Company?.Name ?? "Unknown"
    };

    return Results.Ok(response);
});

app.MapPost("companyevents", async (HttpRequest req, AppDbContext db) =>
{
    var form = await req.ReadFormAsync();
    int companyId = int.Parse(form["id"].ToString());
    
    var events = await db.Events
        .Where(e => e.CompanyId == companyId)
        .Include(e => e.Company)
        .ToListAsync();
    
    var eventResponses = events.Select(e => new EventResponse
    {
        Id = e.Id,
        Title = e.Title,
        Description = e.Description,
        Likes = e.Likes,
        Photo = Convert.ToBase64String(e.Photo),
        Company = e.Company?.Name ?? "Unknown"
    }).ToList();

    return Results.Ok(eventResponses);
});

app.MapPut("deleteevent", async (HttpRequest req, AppDbContext db) =>
{
    var form = await req.ReadFormAsync();
    int eventId = int.Parse(form["id"]);
    
    var eventToDelete = await db.Events.FindAsync(eventId);
    if (eventToDelete == null)
        return Results.NotFound("Event not found");
    
    db.Events.Remove(eventToDelete);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapPost("/companies/{id}/upload-menu", async (int id, HttpRequest request, AppDbContext db) =>
{
    var company = await db.Companies.FindAsync(id);
    if (company == null) return Results.NotFound();

    var form = await request.ReadFormAsync();
    var file = form.Files["file"];
    if (file == null || file.ContentType != "application/pdf")
        return Results.BadRequest("Fișier lipsă sau format greșit");

    using var stream = file.OpenReadStream();
    using var ms = new MemoryStream();
    await stream.CopyToAsync(ms);

    company.MenuName = file.FileName;
    company.MenuData = ms.ToArray();

    await db.SaveChangesAsync();
    return Results.Ok("Meniul a fost încărcat");
});

app.MapGet("/companyhours/{companyId}", async (AppDbContext context, int companyId) =>
{
    var hours = await context.CompanyHours
        .Where(ch => ch.CompanyId == companyId)
        .OrderBy(ch => ch.DayOfWeek)
        .ToListAsync();

    // Convert to DTOs for proper JSON serialization
    var hourDtos = hours.Select(h => new CompanyHourDto
    {
        DayOfWeek = h.DayOfWeek.ToString(),
        Is24Hours = h.Is24Hours,
        OpenTime = h.OpenTime?.ToString(@"hh\:mm") ?? "",
        CloseTime = h.CloseTime?.ToString(@"hh\:mm") ?? ""
    }).ToList();

    return Results.Ok(hourDtos);
});

// POST endpoint for creating company hours (JSON)
app.MapPost("/companyhours/{companyId}", async (HttpRequest req, AppDbContext db, int companyId) =>
{
    try
    {
        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var scheduleData = JsonSerializer.Deserialize<List<CompanyHourDto>>(body);
        
        if (scheduleData == null || !scheduleData.Any())
        {
            return Results.BadRequest("Invalid schedule data");
        }

        // Check if company hours already exist
        var existingHours = await db.CompanyHours
            .Where(ch => ch.CompanyId == companyId)
            .ToListAsync();

        if (existingHours.Any())
        {
            return Results.Conflict("Company hours already exist. Use PUT to update.");
        }

        // Add new hours
        foreach (var dto in scheduleData)
        {
            TimeSpan? openTime = null;
            TimeSpan? closeTime = null;
            
            if (!string.IsNullOrEmpty(dto.OpenTime) && 
                TimeSpan.TryParse(dto.OpenTime, out var openTs))
            {
                openTime = openTs;
            }
            
            if (!string.IsNullOrEmpty(dto.CloseTime) && 
                TimeSpan.TryParse(dto.CloseTime, out var closeTs))
            {
                closeTime = closeTs;
            }
            
            if (Enum.TryParse<DayOfWeekEnum>(dto.DayOfWeek, out var dayOfWeek))
            {
                db.CompanyHours.Add(new CompanyHour
                {
                    DayOfWeek = dayOfWeek,
                    Is24Hours = dto.Is24Hours,
                    OpenTime = openTime,
                    CloseTime = closeTime,
                    CompanyId = companyId
                });
            }
        }
        
        await db.SaveChangesAsync();
        return Results.Ok("Schedule created successfully");
    }
    catch (Exception ex)
    {
        return Results.Problem($"Error creating schedule: {ex.Message}");
    }
});

// PUT endpoint for updating company hours (JSON)
app.MapPut("/companyhours/{companyId}", async (HttpRequest req, AppDbContext db, int companyId) =>
{
    try
    {
        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var scheduleData = JsonSerializer.Deserialize<List<CompanyHourDto>>(body);
        
        if (scheduleData == null || !scheduleData.Any())
        {
            return Results.BadRequest("Invalid schedule data");
        }

        // Get existing hours
        var existingHours = await db.CompanyHours
            .Where(ch => ch.CompanyId == companyId)
            .ToListAsync();
        
        // Remove existing
        db.CompanyHours.RemoveRange(existingHours);
        
        // Add new hours
        foreach (var dto in scheduleData)
        {
            TimeSpan? openTime = null;
            TimeSpan? closeTime = null;
            
            if (!string.IsNullOrEmpty(dto.OpenTime) && 
                TimeSpan.TryParse(dto.OpenTime, out var openTs))
            {
                openTime = openTs;
            }
            
            if (!string.IsNullOrEmpty(dto.CloseTime) && 
                TimeSpan.TryParse(dto.CloseTime, out var closeTs))
            {
                closeTime = closeTs;
            }
            
            if (Enum.TryParse<DayOfWeekEnum>(dto.DayOfWeek, out var dayOfWeek))
            {
                db.CompanyHours.Add(new CompanyHour
                {
                    DayOfWeek = dayOfWeek,
                    Is24Hours = dto.Is24Hours,
                    OpenTime = openTime,
                    CloseTime = closeTime,
                    CompanyId = companyId
                });
            }
        }
        
        await db.SaveChangesAsync();
        return Results.Ok("Schedule updated successfully");
    }
    catch (Exception ex)
    {
        return Results.Problem($"Error updating schedule: {ex.Message}");
    }
});

// In Program.cs
app.MapPut("/companyhours", async (HttpContext context, AppDbContext dbContext) =>
{
    try
    {
        var form = await context.Request.ReadFormAsync();
        
        // Get company ID
        if (!form.TryGetValue("companyId", out var companyIdValue) || 
            !int.TryParse(companyIdValue, out int companyId))
        {
            return Results.BadRequest("Invalid company ID");
        }

        // Get hours JSON
        if (!form.TryGetValue("hours", out var hoursJson))
        {
            return Results.BadRequest("Missing hours data");
        }

        // Deserialize JSON
        var dtos = JsonSerializer.Deserialize<List<CompanyHourDto>>(hoursJson);
        if (dtos == null || !dtos.Any())
        {
            return Results.BadRequest("Invalid hours data");
        }

        // Get existing hours
        var existingHours = await dbContext.CompanyHours
            .Where(ch => ch.CompanyId == companyId)
            .ToListAsync();
        
        // Remove existing
        dbContext.CompanyHours.RemoveRange(existingHours);
        
        // Add new hours
        foreach (var dto in dtos)
        {
            TimeSpan? openTime = null;
            TimeSpan? closeTime = null;
            
            if (!string.IsNullOrEmpty(dto.OpenTime) && 
                TimeSpan.TryParse(dto.OpenTime, out var openTs))
            {
                openTime = openTs;
            }
            
            if (!string.IsNullOrEmpty(dto.CloseTime) && 
                TimeSpan.TryParse(dto.CloseTime, out var closeTs))
            {
                closeTime = closeTs;
            }
            
            if (Enum.TryParse<DayOfWeekEnum>(dto.DayOfWeek, out var dayOfWeek))
            {
                dbContext.CompanyHours.Add(new CompanyHour
                {
                    DayOfWeek = dayOfWeek,
                    Is24Hours = dto.Is24Hours,
                    OpenTime = openTime,
                    CloseTime = closeTime,
                    CompanyId = companyId
                });
            }
        }
        
        await dbContext.SaveChangesAsync();
        return Results.Ok();
    }
    catch (Exception ex)
    {
        // Log the exception
        context.RequestServices.GetRequiredService<ILogger<Program>>()
            .LogError(ex, "Error saving company hours");
            
        return Results.Problem($"Error: {ex.Message}");
    }
});

// Reservation endpoints
app.MapPost("/reservation", async (HttpRequest req, AppDbContext db) =>
{
    try
    {
        var form = await req.ReadFormAsync();
        
        var reservation = new Reservation
        {
            CustomerName = form["customerName"].ToString(),
            CustomerEmail = form["customerEmail"].ToString(),
            CustomerPhone = form["customerPhone"].ToString(),
            ReservationDate = DateTime.Parse(form["reservationDate"].ToString()),
            ReservationTime = TimeSpan.Parse(form["reservationTime"].ToString()),
            NumberOfPeople = int.Parse(form["numberOfPeople"].ToString()),
            SpecialRequests = form["specialRequests"].ToString(),
            CompanyId = int.Parse(form["companyId"].ToString()),
            Status = ReservationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Reservations.Add(reservation);
        await db.SaveChangesAsync();

        return Results.Created($"/reservation/{reservation.Id}", reservation);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Error creating reservation: {ex.Message}");
    }
});

app.MapGet("/reservation/company/{companyId}", async (AppDbContext db, int companyId) =>
{
    try
    {
        var reservations = await db.Reservations
            .Where(r => r.CompanyId == companyId)
            .OrderByDescending(r => r.ReservationDate)
            .ThenBy(r => r.ReservationTime)
            .ToListAsync();

        return Results.Ok(reservations);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Error fetching reservations: {ex.Message}");
    }
});

app.MapPut("/reservation/{id}", async (int id, HttpRequest req, AppDbContext db) =>
{
    try
    {
        var form = await req.ReadFormAsync();
        var reservation = await db.Reservations.FindAsync(id);
        
        if (reservation == null)
            return Results.NotFound("Reservation not found");

        if (form.ContainsKey("status"))
        {
            reservation.Status = Enum.Parse<ReservationStatus>(form["status"].ToString());
            reservation.UpdatedAt = DateTime.UtcNow;
            
            if (reservation.Status == ReservationStatus.Confirmed)
                reservation.ConfirmedAt = DateTime.UtcNow;
            else if (reservation.Status == ReservationStatus.Completed)
                reservation.CompletedAt = DateTime.UtcNow;
            else if (reservation.Status == ReservationStatus.Canceled)
                reservation.CanceledAt = DateTime.UtcNow;
        }

        if (form.ContainsKey("notes"))
            reservation.Notes = form["notes"].ToString();

        if (form.ContainsKey("cancellationReason"))
            reservation.CancellationReason = form["cancellationReason"].ToString();

        await db.SaveChangesAsync();
        return Results.Ok(reservation);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Error updating reservation: {ex.Message}");
    }
});

app.Run();