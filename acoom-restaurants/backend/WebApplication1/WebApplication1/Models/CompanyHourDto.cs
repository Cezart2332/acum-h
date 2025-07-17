using System.Text.Json.Serialization;

namespace WebApplication1.Models;

public class CompanyHourDto
{
    [JsonPropertyName("dayOfWeek")]
    public string DayOfWeek { get; set; } = string.Empty;
    
    [JsonPropertyName("is24Hours")]
    public bool Is24Hours { get; set; }
    
    [JsonPropertyName("openTime")]
    public string? OpenTime { get; set; }
    
    [JsonPropertyName("closeTime")]
    public string? CloseTime { get; set; }
}