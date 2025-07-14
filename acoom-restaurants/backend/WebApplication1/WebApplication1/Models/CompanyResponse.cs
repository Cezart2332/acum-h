namespace WebApplication1.Models;

public class CompanyResponse
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Email { get; set; }
    public string Address { get; set; }
    
    public string Description { get; set; }
    
    public List<string> Tags { get; set; }
    public Double Latitude { get; set; }
    public Double Longitude { get; set; }
    public int Cui {get; set;}
    public string Category { get; set; }
    public string ProfileImage { get; set; }
}