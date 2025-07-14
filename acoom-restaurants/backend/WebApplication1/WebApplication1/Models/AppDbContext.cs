using Microsoft.EntityFrameworkCore;

namespace WebApplication1.Models
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<Company> Companies { get; set; }
        public DbSet<CompanyHour> CompanyHours { get; set; }
        public DbSet<Event> Events { get; set; }
        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure Companies
            modelBuilder.Entity<Company>().ToTable("companies");
            
            // Configure CompanyHours
            modelBuilder.Entity<CompanyHour>().ToTable("companyhours");
            modelBuilder.Entity<CompanyHour>()
                .Property(ch => ch.DayOfWeek)
                .HasConversion<string>()
                .IsRequired();
                
            modelBuilder.Entity<CompanyHour>()
                .HasIndex(ch => new { ch.CompanyId, ch.DayOfWeek })
                .IsUnique();
                
            modelBuilder.Entity<CompanyHour>()
                .HasOne(ch => ch.Company)
                .WithMany(c => c.CompanyHours)
                .HasForeignKey(ch => ch.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
            
            // Configure Events
            modelBuilder.Entity<Event>().ToTable("events");
            modelBuilder.Entity<Event>()
                .HasOne(e => e.Company)
                .WithMany(c => c.Events)
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
            
            // Configure Users
            modelBuilder.Entity<User>().ToTable("users");
        }
    }
}