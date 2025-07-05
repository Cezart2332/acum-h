using System.ComponentModel.DataAnnotations.Schema;

namespace WebApplication1.Models
{
    [Table("companies")]
    public class Company
    {
        public int Id { get; set; }

        public string Name    { get; set; } = string.Empty;
        public string Email   { get; set; } = string.Empty;
        
        public string Description { get; set; } = string.Empty;
        
        public string Address { get; set; } = string.Empty;
        
        public string Tags { get; set; } = string.Empty;

        public double Latitude  { get; set; }
        public double Longitude { get; set; }
        public int Cui          { get; set; }
        public string Category  { get; set; } = string.Empty;
        public string Password  { get; set; } = string.Empty;
        public byte[] ProfileImage { get; set; } = Array.Empty<byte>();
        
        public string MenuName { get; set; } = string.Empty; // 🆕
        public byte[] MenuData { get; set; } = Array.Empty<byte>(); // 🆕

        public ICollection<Event> Events { get; set; } = new List<Event>();
        public ICollection<CompanyHour> CompanyHours { get; set; } = new List<CompanyHour>();
    }
}