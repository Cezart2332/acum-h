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
        public DbSet<Reservation> Reservations { get; set; }

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
            
            // Configure Reservations
            modelBuilder.Entity<Reservation>().ToTable("reservations");
            modelBuilder.Entity<Reservation>()
                .Property(r => r.Status)
                .HasConversion<string>()
                .IsRequired();
                
            modelBuilder.Entity<Reservation>()
                .HasOne(r => r.Company)
                .WithMany()
                .HasForeignKey(r => r.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
                
            modelBuilder.Entity<Reservation>()
                .HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.SetNull);
                
            modelBuilder.Entity<Reservation>()
                .HasIndex(r => new { r.CompanyId, r.ReservationDate, r.ReservationTime })
                .IsUnique(false);
                
            modelBuilder.Entity<Reservation>()
                .HasIndex(r => r.Status);
                
            modelBuilder.Entity<Reservation>()
                .HasIndex(r => r.CreatedAt);
        }
    }
}