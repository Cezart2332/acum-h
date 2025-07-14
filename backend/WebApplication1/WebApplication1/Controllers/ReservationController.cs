using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApplication1.Models;

namespace WebApplication1.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReservationController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ReservationController> _logger;

        public ReservationController(AppDbContext context, ILogger<ReservationController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/reservation/company/{companyId}
        [HttpGet("company/{companyId}")]
        public async Task<ActionResult<IEnumerable<ReservationResponse>>> GetReservationsByCompany(int companyId, [FromQuery] ReservationStatus? status = null)
        {
            try
            {
                var query = _context.Reservations
                    .Include(r => r.Company)
                    .Where(r => r.CompanyId == companyId);

                if (status.HasValue)
                {
                    query = query.Where(r => r.Status == status.Value);
                }

                var reservations = await query
                    .OrderByDescending(r => r.ReservationDate)
                    .ThenBy(r => r.ReservationTime)
                    .Select(r => new ReservationResponse
                    {
                        Id = r.Id,
                        CustomerName = r.CustomerName,
                        CustomerEmail = r.CustomerEmail,
                        CustomerPhone = r.CustomerPhone,
                        ReservationDate = r.ReservationDate,
                        ReservationTime = r.ReservationTime,
                        NumberOfPeople = r.NumberOfPeople,
                        SpecialRequests = r.SpecialRequests,
                        Status = r.Status,
                        CreatedAt = r.CreatedAt,
                        UpdatedAt = r.UpdatedAt,
                        ConfirmedAt = r.ConfirmedAt,
                        CompletedAt = r.CompletedAt,
                        CanceledAt = r.CanceledAt,
                        CancellationReason = r.CancellationReason,
                        Notes = r.Notes,
                        CompanyId = r.CompanyId,
                        CompanyName = r.Company.Name,
                        UserId = r.UserId
                    })
                    .ToListAsync();

                return Ok(reservations);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching reservations for company {CompanyId}", companyId);
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/reservation/summary/{companyId}
        [HttpGet("summary/{companyId}")]
        public async Task<ActionResult<ReservationSummaryResponse>> GetReservationSummary(int companyId)
        {
            try
            {
                var summary = await _context.Reservations
                    .Where(r => r.CompanyId == companyId)
                    .GroupBy(r => r.Status)
                    .Select(g => new { Status = g.Key, Count = g.Count() })
                    .ToListAsync();

                var response = new ReservationSummaryResponse
                {
                    TotalReservations = summary.Sum(s => s.Count),
                    PendingReservations = summary.FirstOrDefault(s => s.Status == ReservationStatus.Pending)?.Count ?? 0,
                    ConfirmedReservations = summary.FirstOrDefault(s => s.Status == ReservationStatus.Confirmed)?.Count ?? 0,
                    CompletedReservations = summary.FirstOrDefault(s => s.Status == ReservationStatus.Completed)?.Count ?? 0,
                    CanceledReservations = summary.FirstOrDefault(s => s.Status == ReservationStatus.Canceled)?.Count ?? 0,
                    NoShowReservations = summary.FirstOrDefault(s => s.Status == ReservationStatus.NoShow)?.Count ?? 0
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching reservation summary for company {CompanyId}", companyId);
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/reservation/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<ReservationResponse>> GetReservation(int id)
        {
            try
            {
                var reservation = await _context.Reservations
                    .Include(r => r.Company)
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (reservation == null)
                {
                    return NotFound("Reservation not found");
                }

                var response = new ReservationResponse
                {
                    Id = reservation.Id,
                    CustomerName = reservation.CustomerName,
                    CustomerEmail = reservation.CustomerEmail,
                    CustomerPhone = reservation.CustomerPhone,
                    ReservationDate = reservation.ReservationDate,
                    ReservationTime = reservation.ReservationTime,
                    NumberOfPeople = reservation.NumberOfPeople,
                    SpecialRequests = reservation.SpecialRequests,
                    Status = reservation.Status,
                    CreatedAt = reservation.CreatedAt,
                    UpdatedAt = reservation.UpdatedAt,
                    ConfirmedAt = reservation.ConfirmedAt,
                    CompletedAt = reservation.CompletedAt,
                    CanceledAt = reservation.CanceledAt,
                    CancellationReason = reservation.CancellationReason,
                    Notes = reservation.Notes,
                    CompanyId = reservation.CompanyId,
                    CompanyName = reservation.Company.Name,
                    UserId = reservation.UserId
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching reservation {Id}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/reservation
        [HttpPost]
        public async Task<ActionResult<ReservationResponse>> CreateReservation(CreateReservationRequest request)
        {
            try
            {
                // Validate company exists
                var company = await _context.Companies.FindAsync(request.CompanyId);
                if (company == null)
                {
                    return BadRequest("Company not found");
                }

                // Check if reservation date is in the future
                if (request.ReservationDate.Date < DateTime.Today)
                {
                    return BadRequest("Reservation date must be in the future");
                }

                // Check if reservation time is within business hours
                var dayOfWeek = request.ReservationDate.DayOfWeek;
                var companyHours = await _context.CompanyHours
                    .FirstOrDefaultAsync(ch => ch.CompanyId == request.CompanyId && 
                                              ch.DayOfWeek.ToString() == dayOfWeek.ToString());

                if (companyHours != null && !companyHours.Is24Hours)
                {
                    if (companyHours.OpenTime.HasValue && companyHours.CloseTime.HasValue)
                    {
                        if (request.ReservationTime < companyHours.OpenTime.Value || 
                            request.ReservationTime > companyHours.CloseTime.Value)
                        {
                            return BadRequest("Reservation time is outside business hours");
                        }
                    }
                }

                var reservation = new Reservation
                {
                    CustomerName = request.CustomerName,
                    CustomerEmail = request.CustomerEmail,
                    CustomerPhone = request.CustomerPhone,
                    ReservationDate = request.ReservationDate,
                    ReservationTime = request.ReservationTime,
                    NumberOfPeople = request.NumberOfPeople,
                    SpecialRequests = request.SpecialRequests,
                    Status = ReservationStatus.Pending,
                    CompanyId = request.CompanyId,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Reservations.Add(reservation);
                await _context.SaveChangesAsync();

                var response = new ReservationResponse
                {
                    Id = reservation.Id,
                    CustomerName = reservation.CustomerName,
                    CustomerEmail = reservation.CustomerEmail,
                    CustomerPhone = reservation.CustomerPhone,
                    ReservationDate = reservation.ReservationDate,
                    ReservationTime = reservation.ReservationTime,
                    NumberOfPeople = reservation.NumberOfPeople,
                    SpecialRequests = reservation.SpecialRequests,
                    Status = reservation.Status,
                    CreatedAt = reservation.CreatedAt,
                    CompanyId = reservation.CompanyId,
                    CompanyName = company.Name
                };

                return CreatedAtAction(nameof(GetReservation), new { id = reservation.Id }, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating reservation");
                return StatusCode(500, "Internal server error");
            }
        }

        // PUT: api/reservation/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<ReservationResponse>> UpdateReservation(int id, UpdateReservationRequest request)
        {
            try
            {
                var reservation = await _context.Reservations.FindAsync(id);
                if (reservation == null)
                {
                    return NotFound("Reservation not found");
                }

                reservation.Status = request.Status;
                reservation.UpdatedAt = DateTime.UtcNow;

                // Update status-specific timestamps
                switch (request.Status)
                {
                    case ReservationStatus.Confirmed:
                        reservation.ConfirmedAt = DateTime.UtcNow;
                        break;
                    case ReservationStatus.Completed:
                        reservation.CompletedAt = DateTime.UtcNow;
                        break;
                    case ReservationStatus.Canceled:
                        reservation.CanceledAt = DateTime.UtcNow;
                        reservation.CancellationReason = request.CancellationReason;
                        break;
                }

                reservation.Notes = request.Notes;

                await _context.SaveChangesAsync();

                var company = await _context.Companies.FindAsync(reservation.CompanyId);
                var response = new ReservationResponse
                {
                    Id = reservation.Id,
                    CustomerName = reservation.CustomerName,
                    CustomerEmail = reservation.CustomerEmail,
                    CustomerPhone = reservation.CustomerPhone,
                    ReservationDate = reservation.ReservationDate,
                    ReservationTime = reservation.ReservationTime,
                    NumberOfPeople = reservation.NumberOfPeople,
                    SpecialRequests = reservation.SpecialRequests,
                    Status = reservation.Status,
                    CreatedAt = reservation.CreatedAt,
                    UpdatedAt = reservation.UpdatedAt,
                    ConfirmedAt = reservation.ConfirmedAt,
                    CompletedAt = reservation.CompletedAt,
                    CanceledAt = reservation.CanceledAt,
                    CancellationReason = reservation.CancellationReason,
                    Notes = reservation.Notes,
                    CompanyId = reservation.CompanyId,
                    CompanyName = company?.Name ?? "",
                    UserId = reservation.UserId
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating reservation {Id}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // DELETE: api/reservation/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReservation(int id)
        {
            try
            {
                var reservation = await _context.Reservations.FindAsync(id);
                if (reservation == null)
                {
                    return NotFound("Reservation not found");
                }

                _context.Reservations.Remove(reservation);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting reservation {Id}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/reservation/available-times/{companyId}
        [HttpGet("available-times/{companyId}")]
        public async Task<ActionResult<IEnumerable<TimeSpan>>> GetAvailableTimes(int companyId, [FromQuery] DateTime date)
        {
            try
            {
                var companyHours = await _context.CompanyHours
                    .FirstOrDefaultAsync(ch => ch.CompanyId == companyId && 
                                              ch.DayOfWeek.ToString() == date.DayOfWeek.ToString());

                if (companyHours == null)
                {
                    return BadRequest("Restaurant is closed on this day");
                }

                if (companyHours.Is24Hours)
                {
                    // Generate times for 24-hour operation (every 30 minutes from 00:00 to 23:30)
                    var times = new List<TimeSpan>();
                    for (int hour = 0; hour < 24; hour++)
                    {
                        for (int minute = 0; minute < 60; minute += 30)
                        {
                            times.Add(new TimeSpan(hour, minute, 0));
                        }
                    }
                    return Ok(times);
                }

                if (!companyHours.OpenTime.HasValue || !companyHours.CloseTime.HasValue)
                {
                    return BadRequest("Business hours not configured for this day");
                }

                // Generate available times (every 30 minutes within business hours)
                var availableTimes = new List<TimeSpan>();
                var currentTime = companyHours.OpenTime.Value;
                var closeTime = companyHours.CloseTime.Value;

                while (currentTime <= closeTime)
                {
                    availableTimes.Add(currentTime);
                    currentTime = currentTime.Add(TimeSpan.FromMinutes(30));
                }

                // Filter out times that are already fully booked
                var existingReservations = await _context.Reservations
                    .Where(r => r.CompanyId == companyId && 
                               r.ReservationDate.Date == date.Date &&
                               r.Status != ReservationStatus.Canceled)
                    .GroupBy(r => r.ReservationTime)
                    .Select(g => new { Time = g.Key, Count = g.Count() })
                    .ToListAsync();

                // For now, we'll assume a simple capacity check
                // In a real application, you'd want to check actual table availability
                const int maxReservationsPerTimeSlot = 10; // Adjust based on restaurant capacity

                var availableTimesFiltered = availableTimes
                    .Where(time => !existingReservations.Any(r => r.Time == time && r.Count >= maxReservationsPerTimeSlot))
                    .ToList();

                return Ok(availableTimesFiltered);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching available times for company {CompanyId} on {Date}", companyId, date);
                return StatusCode(500, "Internal server error");
            }
        }
    }
}