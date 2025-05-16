namespace WebApplication1.Models;
using System.ComponentModel.DataAnnotations.Schema;

[Table("companies")]
public class Company
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Email { get; set; }
    public string Address { get; set; }
    public int Cui {get; set;}
    public string Category { get; set; }
    public string Password { get; set; }
    public byte[] ProfileImage { get; set; } = Array.Empty<byte>();
    public ICollection<Event> Events { get; set; } = new List<Event>();
}