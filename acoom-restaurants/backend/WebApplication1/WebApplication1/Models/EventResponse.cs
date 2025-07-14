namespace WebApplication1.Models;

public class EventResponse
{
    public int Id { get; set; }
    public string Photo { get; set; } 
    public string Title { get; set; }
    
    public List<string> Tags { get; set; }
    
    public string Description { get; set; }
    public int Likes { get; set; }
    public string Company { get; set; }
}