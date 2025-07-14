namespace WebApplication1.Models;

public class CompanyHourDto
{
    public DayOfWeekEnum DayOfWeek { get; set; }
    public bool Is24Hours { get; set; }
    public string? OpenTime { get; set; }
    public string? CloseTime { get; set; }
}