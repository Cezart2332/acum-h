using WebApplication1.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;    
using System.IO;                     
using System.Threading.Tasks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<UsersDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

builder.Services.AddDbContext<CompanyDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));
builder.Services.AddDbContext<EventDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));


var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}



app.UseHttpsRedirection();

app.Urls.Clear();
app.Urls.Add("http://0.0.0.0:5298");


app.MapGet("/users", async (UsersDbContext db) =>
    await db.Users.ToListAsync());

app.MapGet("/users/{id:int}", async (int id, UsersDbContext db) =>
    await db.Users.FindAsync(id)
        is User user
        ? Results.Ok(user)
        : Results.NotFound());

app.MapPost("/users", async (HttpRequest req, UsersDbContext db) =>
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

    var userResponse = new UserResponse
    {
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

app.MapPut("/users/{id:int}", async (int id, User input, UsersDbContext db) =>
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
app.MapPost("/login", async (LoginRequest req, 
                             UsersDbContext userDb, 
                             CompanyDbContext companyDb) =>
{
    var user = await userDb.Users
                            .FirstOrDefaultAsync(u => u.Username == req.Username 
                                                   || u.Email == req.Username);
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
        Console.WriteLine(userResponse);
        return Results.Ok(userResponse);
    }
    
    var company = await companyDb.Companies
                                 .FirstOrDefaultAsync(c => c.Name == req.Username 
                                                        || c.Email == req.Username);
    if (company != null && BCrypt.Net.BCrypt.Verify(req.Password, company.Password))
    {
        string pfpCompany = company.ProfileImage is not null
                            ? Convert.ToBase64String(company.ProfileImage)
                            : null;

        var companyResponse = new 
        {
            Type = "Company",
            Id = company.Id,
            Name = company.Name,
            Email = company.Email,
            Address = company.Address,
            Cui = company.Cui,
            Category = company.Category,
            ProfileImage = pfpCompany
        };
        Console.WriteLine(companyResponse);
        return Results.Ok(companyResponse);
    }
    
    return Results.Unauthorized();
});
app.MapGet("/companies", async (CompanyDbContext db) =>
{
    await db.Companies.ToListAsync();
});
app.MapPost("/companies", async (HttpRequest req, CompanyDbContext db) =>
{
    var form = await req.ReadFormAsync();
    if (await db.Companies.AnyAsync(c => c.Name == form["name"].ToString()) ||
        await db.Companies.AnyAsync(c => c.Email == form["email"].ToString()))
    {
        return Results.Conflict(new {Error = "Name or email already exists!"});
    }

    var file = form.Files.GetFile("default");
    
    var company = new Company
    {
        Name = form["name"].ToString(),
        Email = form["email"].ToString(),
        Address = form["address"].ToString(),
        Cui = int.Parse(form["cui"].ToString()) ,
        Category = form["category"].ToString(),
        Password = BCrypt.Net.BCrypt.HashPassword(form["password"].ToString()),
    };

    if (file != null && file.Length > 0)
    {
        using var ms = new MemoryStream();
        await file.OpenReadStream().CopyToAsync(ms);
        company.ProfileImage = ms.ToArray();
    }
    
    string pfpCompany = company.ProfileImage is not null
        ? Convert.ToBase64String(company.ProfileImage)
        : null;

    Console.WriteLine(pfpCompany);
    
    var companyResponse = new CompanyResponse
    {
        Id = company.Id,
        Name = company.Name,
        Email = company.Email,
        Address = company.Address,
        Cui = company.Cui,
        Category = company.Category,
        ProfileImage = pfpCompany
    };


    db.Companies.Add(company);
    await db.SaveChangesAsync();
    return Results.Created($"/companies/{company.Id}", companyResponse);
});
app.MapPut("changepfpcompany", async (HttpRequest req, CompanyDbContext db) =>
{
    Console.WriteLine("changepfpcompany");
    var form = await req.ReadFormAsync();
    int companyId = int.Parse(form["companyId"]);
    var file = form.Files.GetFile("file");
    var company = await db.Companies.FindAsync(companyId);
    if (file != null && file.Length > 0)
    {
        using var ms = new MemoryStream();
        await file.OpenReadStream().CopyToAsync(ms);
        company.ProfileImage = ms.ToArray();
    }

    await db.SaveChangesAsync();
    return Results.NoContent();
});
app.MapPost("/events", async (HttpRequest req, EventDbContext db) =>
{
    var form = await req.ReadFormAsync();

    var file = form.Files.GetFile("file");
    var newEvent = new Event
    {
        Title = form["title"].ToString(),
        Description = form["description"].ToString(),
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
app.MapGet("/events", async (EventDbContext db, CompanyDbContext db1) =>
{
    List<Event> events = await db.Events.ToListAsync();
    List<EventResponse> eventResponses = new List<EventResponse>();
    foreach (var e in events)
    {
        var company = await db1.Companies.FindAsync(e.CompanyId);
        var er = new EventResponse
        {
            Id = e.Id,
            Title = e.Title,
            Description = e.Description,
            Likes = e.Likes,
            Photo = Convert.ToBase64String(e.Photo),
            Company = company.Name
        };
        eventResponses.Add(er);
    }
    return Results.Ok(eventResponses);
});
app.MapPost("companyevents", async (HttpRequest req, CompanyDbContext db, EventDbContext db1) =>
{
    var form = await req.ReadFormAsync();
    List<Event> events = await db1.Events.ToListAsync();
    List<EventResponse> eventResponses = new List<EventResponse>();
    Console.WriteLine(form["id"].ToString());
    Console.WriteLine("test");
    int companyId = int.Parse(form["id"].ToString());
    foreach (var e in events)
    {
        var company = await db1.Companies.FindAsync(e.CompanyId);

        if (companyId == e.CompanyId)
        {
            var er = new EventResponse
            {
                Id = e.Id,
                Title = e.Title,
                Description = e.Description,
                Likes = e.Likes,
                Photo = Convert.ToBase64String(e.Photo),
                Company = company.Name
            };
            eventResponses.Add(er);
        }
    }

    return Results.Ok(eventResponses);
});

app.Run();