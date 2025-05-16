using Microsoft.EntityFrameworkCore;

namespace WebApplication1.Models;

public class EventDbContext : DbContext
{
    public EventDbContext(DbContextOptions<EventDbContext> options)
        : base(options)
    {
    }

    public DbSet<Event> Events => Set<Event>();
    public DbSet<Company> Companies { get; set; }    // << adaugă asta

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Company>()
            .ToTable("companies");  
        
        modelBuilder.Entity<Event>()
            .HasOne(e => e.Company)
            .WithMany(c => c.Events)
            .HasForeignKey(e => e.CompanyId);

        base.OnModelCreating(modelBuilder);
    }
}