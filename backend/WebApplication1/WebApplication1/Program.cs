using WebApplication1.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;    
using System.IO;                     
using System.Threading.Tasks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// Register only the single AppDbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.Urls.Clear();
app.Urls.Add("http://0.0.0.0:5298");

// All endpoints updated to use AppDbContext
app.MapGet("/users", async (AppDbContext db) =>
    await db.Users.ToListAsync());

app.MapGet("/users/{id:int}", async (int id, AppDbContext db) =>
    await db.Users.FindAsync(id)
        is User user
        ? Results.Ok(user)
        : Results.NotFound());

app.MapPost("/users", async (HttpRequest req, AppDbContext db) =>
{
    var form = await req.ReadFormAsync();
    if (await db.Users.AnyAsync(u => u.Username == form["username"].ToString()) ||
        await db.Users.AnyAsync(u => u.Email == form["email"].ToString()))
    {
        return Results.Conflict(new {Error = "Username or email already exists!"});
    }

    var file = form.Files.GetFile("default");
    var user = new User
    {
        Username = form["username"].ToString(),
        FirstName = form["firstname"].ToString(),
        LastName = form["lastname"].ToString(),
        Email = form["email"].ToString(),
        Password = BCrypt.Net.BCrypt.HashPassword(form["password"].ToString()),
    };
    if (file != null && file.Length > 0)
    {
        using var ms = new MemoryStream();
        await file.OpenReadStream().CopyToAsync(ms);
        user.ProfileImage = ms.ToArray();
    }
    string pfpUser = user.ProfileImage is not null
        ? Convert.ToBase64String(user.ProfileImage)
        : null;

    int lastId = await db.Users
        .OrderByDescending(u => u.Id)
        .Select(u => u.Id)
        .FirstOrDefaultAsync();
    var userResponse = new UserResponse
    {
        Id = lastId + 1,
        Username = user.Username,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Email = user.Email,
        ProfileImage = pfpUser
    };

    db.Users.Add(user);
    await db.SaveChangesAsync();
    return Results.Created($"/users/{user.Id}", userResponse);
});

app.MapPut("/users/{id:int}", async (int id, User input, AppDbContext db) =>
{
    var user = await db.Users.FindAsync(id);
    if (user is null) return Results.NotFound();

    user.Username = input.Username;
    user.FirstName = input.FirstName;
    user.LastName = input.LastName;
    user.Password = input.Password;
    user.Email = input.Email;

    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapPost("/login", async (LoginRequest req, AppDbContext db) =>
{
    var user = await db.Users
        .FirstOrDefaultAsync(u => u.Username == req.Username || u.Email == req.Username);
    if (user != null && BCrypt.Net.BCrypt.Verify(req.Password, user.Password))
    {
        string pfpUser = user.ProfileImage is not null
            ? Convert.ToBase64String(user.ProfileImage)
            : null;

        var userResponse = new
        {
            Type = "User",
            Id = user.Id,
            Username = user.Username,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            ProfileImage = pfpUser
        };
        return Results.Ok(userResponse);
    }
    return Results.Unauthorized();
});

app.MapGet("/companies", async (AppDbContext db) =>
{
    List<Company> companies = await db.Companies.ToListAsync();
    List<CompanyResponse> companiesResponses = new List<CompanyResponse>();
    foreach (var c in companies)
    {
        var cr = new CompanyResponse
        {
            Id = c.Id,
            Name = c.Name,
            Email = c.Email,
            Address = c.Address,
            Description = c.Description,
            Tags = c.Tags.Split(",").ToList(),
            Longitude = c.Longitude,
            Latitude = c.Latitude,
            Cui = c.Cui,
            Category = c.Category,
            ProfileImage = Convert.ToBase64String(c.ProfileImage)
        };
        companiesResponses.Add(cr);
    }
    return Results.Ok(companiesResponses);
});

app.MapPut("changepfp", async (HttpRequest req, AppDbContext db) =>
{
    if (!req.HasFormContentType)
        return Results.BadRequest("Expected multipart form-data");

    var form = await req.ReadFormAsync();

    if (!form.TryGetValue("id", out var idValues) || !int.TryParse(idValues, out int userId))
        return Results.BadRequest("Missing or invalid 'id'");

    var file = form.Files.GetFile("file");
    if (file == null || file.Length == 0)
        return Results.BadRequest("Missing file");

    var user = await db.Users.FindAsync(userId);
    if (user == null)
        return Results.NotFound();

    using var ms = new MemoryStream();
    await file.OpenReadStream().CopyToAsync(ms);
    user.ProfileImage = ms.ToArray();

    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapGet("/events", async (AppDbContext db) =>
{
    List<Event> events = await db.Events.ToListAsync();
    List<EventResponse> eventResponses = new List<EventResponse>();
    foreach (var e in events)
    {
        var company = await db.Companies.FindAsync(e.CompanyId);
        var er = new EventResponse
        {
            Id = e.Id,
            Title = e.Title,
            Description = e.Description,
            Tags = e.Tags.Split(",").ToList(),
            Likes = e.Likes,
            Photo = Convert.ToBase64String(e.Photo),
            Company = company?.Name ?? "Unknown"
        };
        eventResponses.Add(er);
    }
    return Results.Ok(eventResponses);
});

app.MapPost("companyevents", async (HttpRequest req, AppDbContext db) =>
{
    var form = await req.ReadFormAsync();
    List<Event> events = await db.Events.ToListAsync();
    List<EventResponse> eventResponses = new List<EventResponse>();
    
    int companyId = int.Parse(form["id"].ToString());
    foreach (var e in events)
    {
        if (companyId == e.CompanyId)
        {
            var company = await db.Companies.FindAsync(e.CompanyId);
            var er = new EventResponse
            {
                Id = e.Id,
                Title = e.Title,
                Description = e.Description,
                Likes = e.Likes,
                Photo = Convert.ToBase64String(e.Photo),
                Company = company?.Name ?? "Unknown"
            };
            eventResponses.Add(er);
        }
    }

    return Results.Ok(eventResponses);
});

app.MapGet("/companies/{id}/menu", async (int id, AppDbContext db) =>
{
    var company = await db.Companies.FindAsync(id);
    if (company == null || company.MenuData.Length == 0)
    {
        return Results.NotFound("Meniu inexistent");
    }

    return Results.File(company.MenuData, "application/pdf", company.MenuName);
});

app.Run();