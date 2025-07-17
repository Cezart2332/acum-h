using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApplication1.Models;

namespace WebApplication1.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CompanyHoursController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<CompanyHoursController> _logger;

        public CompanyHoursController(AppDbContext context, ILogger<CompanyHoursController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/companyhours/{companyId}
        [HttpGet("{companyId}")]
        public async Task<ActionResult<IEnumerable<CompanyHourDto>>> GetCompanyHours(int companyId)
        {
            try
            {
                var companyHours = await _context.CompanyHours
                    .Where(ch => ch.CompanyId == companyId)
                    .ToListAsync();

                var result = companyHours.Select(ch => new CompanyHourDto
                {
                    DayOfWeek = ch.DayOfWeek.ToString(),
                    Is24Hours = ch.Is24Hours,
                    OpenTime = ch.OpenTime?.ToString(@"hh\:mm") ?? "",
                    CloseTime = ch.CloseTime?.ToString(@"hh\:mm") ?? ""
                }).ToList();

                // If no hours exist, create default schedule
                if (!result.Any())
                {
                    var defaultHours = CreateDefaultSchedule();
                    return Ok(defaultHours);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching company hours for company {CompanyId}", companyId);
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/companyhours/{companyId}
        [HttpPost("{companyId}")]
        public async Task<ActionResult> CreateOrUpdateCompanyHours(int companyId, [FromBody] List<CompanyHourDto> hoursDto)
        {
            try
            {
                // Validate company exists
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                {
                    return BadRequest("Company not found");
                }

                // Remove existing hours
                var existingHours = await _context.CompanyHours
                    .Where(ch => ch.CompanyId == companyId)
                    .ToListAsync();
                
                _context.CompanyHours.RemoveRange(existingHours);

                // Add new hours
                foreach (var hourDto in hoursDto)
                {
                    if (Enum.TryParse<DayOfWeekEnum>(hourDto.DayOfWeek, out var dayOfWeek))
                    {
                        var companyHour = new CompanyHour
                        {
                            DayOfWeek = dayOfWeek,
                            Is24Hours = hourDto.Is24Hours,
                            OpenTime = hourDto.Is24Hours || string.IsNullOrEmpty(hourDto.OpenTime) 
                                ? null 
                                : TimeSpan.Parse(hourDto.OpenTime),
                            CloseTime = hourDto.Is24Hours || string.IsNullOrEmpty(hourDto.CloseTime) 
                                ? null 
                                : TimeSpan.Parse(hourDto.CloseTime),
                            CompanyId = companyId
                        };

                        _context.CompanyHours.Add(companyHour);
                    }
                }

                await _context.SaveChangesAsync();
                return Ok("Company hours updated successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating company hours for company {CompanyId}", companyId);
                return StatusCode(500, "Internal server error");
            }
        }

        // PUT: api/companyhours/{companyId}/day/{dayOfWeek}
        [HttpPut("{companyId}/day/{dayOfWeek}")]
        public async Task<ActionResult> UpdateDayHours(int companyId, string dayOfWeek, [FromBody] CompanyHourDto hourDto)
        {
            try
            {
                if (!Enum.TryParse<DayOfWeekEnum>(dayOfWeek, out var day))
                {
                    return BadRequest("Invalid day of week");
                }

                var existingHour = await _context.CompanyHours
                    .FirstOrDefaultAsync(ch => ch.CompanyId == companyId && ch.DayOfWeek == day);

                if (existingHour == null)
                {
                    // Create new hour entry
                    existingHour = new CompanyHour
                    {
                        DayOfWeek = day,
                        CompanyId = companyId
                    };
                    _context.CompanyHours.Add(existingHour);
                }

                // Update the hour entry
                existingHour.Is24Hours = hourDto.Is24Hours;
                existingHour.OpenTime = hourDto.Is24Hours || string.IsNullOrEmpty(hourDto.OpenTime) 
                    ? null 
                    : TimeSpan.Parse(hourDto.OpenTime);
                existingHour.CloseTime = hourDto.Is24Hours || string.IsNullOrEmpty(hourDto.CloseTime) 
                    ? null 
                    : TimeSpan.Parse(hourDto.CloseTime);

                await _context.SaveChangesAsync();
                return Ok("Day hours updated successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating day hours for company {CompanyId}, day {DayOfWeek}", companyId, dayOfWeek);
                return StatusCode(500, "Internal server error");
            }
        }

        private List<CompanyHourDto> CreateDefaultSchedule()
        {
            return new List<CompanyHourDto>
            {
                new() { DayOfWeek = "Monday", Is24Hours = false, OpenTime = "09:00", CloseTime = "22:00" },
                new() { DayOfWeek = "Tuesday", Is24Hours = false, OpenTime = "09:00", CloseTime = "22:00" },
                new() { DayOfWeek = "Wednesday", Is24Hours = false, OpenTime = "09:00", CloseTime = "22:00" },
                new() { DayOfWeek = "Thursday", Is24Hours = false, OpenTime = "09:00", CloseTime = "22:00" },
                new() { DayOfWeek = "Friday", Is24Hours = false, OpenTime = "09:00", CloseTime = "23:00" },
                new() { DayOfWeek = "Saturday", Is24Hours = false, OpenTime = "10:00", CloseTime = "23:00" },
                new() { DayOfWeek = "Sunday", Is24Hours = false, OpenTime = "10:00", CloseTime = "22:00" }
            };
        }
    }
}
