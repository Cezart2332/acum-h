# Schedule + Reservation System Implementation

## Overview

This document describes the comprehensive schedule + reservation system implemented for both the main app and the acoom-restaurants app. The system provides full reservation management capabilities with business hours scheduling, status tracking, and real-time availability checking.

## Features Implemented

### 🕒 Schedule Management
- **Business Hours Configuration**: Set opening/closing times for each day of the week
- **24-Hour Operations**: Support for 24-hour restaurant operations
- **Day-Specific Settings**: Configure different hours for different days
- **Visual Schedule Interface**: Intuitive UI for managing business hours

### 📅 Reservation System
- **Create Reservations**: Customers can book tables with date, time, and special requests
- **Status Management**: Track reservations through multiple statuses (Pending, Confirmed, Completed, Canceled, NoShow)
- **Real-time Availability**: Check available time slots based on business hours and existing bookings
- **Reservation Management**: Restaurant owners can view, confirm, and manage all reservations

### 🔧 Backend API
- **RESTful Endpoints**: Complete CRUD operations for reservations
- **Business Logic**: Validation for business hours, capacity limits, and date constraints
- **Database Integration**: Full integration with existing database schema
- **Error Handling**: Comprehensive error handling and validation

## Architecture

### Backend Models

#### Reservation Model
```csharp
public class Reservation
{
    public int Id { get; set; }
    public string CustomerName { get; set; }
    public string CustomerEmail { get; set; }
    public string? CustomerPhone { get; set; }
    public DateTime ReservationDate { get; set; }
    public TimeSpan ReservationTime { get; set; }
    public int NumberOfPeople { get; set; }
    public string? SpecialRequests { get; set; }
    public ReservationStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? CanceledAt { get; set; }
    public string? CancellationReason { get; set; }
    public string? Notes { get; set; }
    public int CompanyId { get; set; }
    public int? UserId { get; set; }
}
```

#### Reservation Status Enum
```csharp
public enum ReservationStatus
{
    Pending,
    Confirmed,
    Completed,
    Canceled,
    NoShow
}
```

### API Endpoints

#### Reservation Endpoints
- `GET /api/reservation/company/{companyId}` - Get all reservations for a company
- `GET /api/reservation/company/{companyId}?status={status}` - Get filtered reservations
- `GET /api/reservation/summary/{companyId}` - Get reservation statistics
- `GET /api/reservation/{id}` - Get specific reservation
- `POST /api/reservation` - Create new reservation
- `PUT /api/reservation/{id}` - Update reservation status
- `DELETE /api/reservation/{id}` - Delete reservation
- `GET /api/reservation/available-times/{companyId}?date={date}` - Get available time slots

### Frontend Components

#### Main App (React Native)
- **ScheduleScreen.tsx**: Business hours management interface
- **Reservation.tsx**: Enhanced reservation creation with API integration
- **Info.tsx**: Added navigation buttons to Schedule and Reservation screens

#### Acoom-Restaurants App (Expo Router)
- **schedule.tsx**: Business hours management interface
- **reservations.tsx**: Enhanced reservation management with API integration
- **company-profile.tsx**: Added navigation to Schedule screen

## Implementation Details

### Database Schema

The system uses the existing `CompanyHour` model for business hours and adds a new `Reservation` table:

```sql
-- Reservations table
CREATE TABLE reservations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    number_of_people INT NOT NULL,
    special_requests TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
    confirmed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    canceled_at TIMESTAMP NULL,
    cancellation_reason TEXT,
    notes TEXT,
    company_id INT NOT NULL,
    user_id INT NULL,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_company_date_time (company_id, reservation_date, reservation_time),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);
```

### Business Logic

#### Reservation Validation
1. **Date Validation**: Reservations must be for future dates
2. **Business Hours Validation**: Reservation time must be within configured business hours
3. **Capacity Validation**: Check against maximum reservations per time slot
4. **Status Transitions**: Proper status flow with timestamp tracking

#### Available Times Calculation
1. **Business Hours Check**: Verify restaurant is open on requested date
2. **24-Hour Support**: Handle 24-hour operations
3. **Existing Reservations**: Filter out fully booked time slots
4. **Time Slot Generation**: Generate 30-minute intervals within business hours

### Frontend Features

#### Schedule Management
- **Day Toggle**: Enable/disable specific days
- **24-Hour Toggle**: Switch between regular hours and 24-hour operation
- **Time Picker**: Select opening and closing times
- **Visual Feedback**: Clear indication of open/closed status

#### Reservation Management
- **Status Filtering**: Filter reservations by status
- **Real-time Updates**: Immediate status updates with API calls
- **Sorting**: Sort by priority (pending first) and timestamp
- **Statistics**: Display reservation counts by status

#### User Experience
- **Loading States**: Show loading indicators during API calls
- **Error Handling**: User-friendly error messages
- **Haptic Feedback**: Tactile feedback for interactions
- **Animations**: Smooth transitions and entrance animations

## API Integration

### Main App Integration
```typescript
// Create reservation
const response = await fetch('http://localhost:5000/api/reservation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(reservationRequest),
});
```

### Acoom-Restaurants Integration
```typescript
// Fetch reservations
const response = await fetch(`http://localhost:5000/api/reservation/company/${companyId}`);

// Update status
const response = await fetch(`http://localhost:5000/api/reservation/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updateRequest),
});
```

## Configuration

### Environment Setup
1. **Backend URL**: Configure API endpoints in both apps
2. **Database Connection**: Ensure database is properly configured
3. **CORS Settings**: Configure CORS for cross-origin requests

### Capacity Settings
- **Max Reservations Per Slot**: Configurable capacity limit (default: 10)
- **Time Slot Interval**: 30-minute intervals (configurable)
- **Advance Booking Limit**: 1 week in advance (configurable)

## Usage Instructions

### For Restaurant Owners

1. **Configure Business Hours**:
   - Navigate to Schedule screen
   - Set opening/closing times for each day
   - Enable/disable specific days
   - Save configuration

2. **Manage Reservations**:
   - View all reservations in Reservations screen
   - Filter by status (Pending, Confirmed, etc.)
   - Update reservation status
   - Add notes or cancellation reasons

### For Customers

1. **Make Reservations**:
   - Select restaurant from main app
   - Choose date and time
   - Enter number of people
   - Add special requests
   - Confirm reservation

## Future Enhancements

### Planned Features
- **Table Management**: Individual table assignment and management
- **Waitlist System**: Handle overflow reservations
- **Notification System**: Email/SMS confirmations and reminders
- **Analytics Dashboard**: Reservation trends and insights
- **Integration**: Calendar integration and external booking systems

### Technical Improvements
- **Real-time Updates**: WebSocket integration for live updates
- **Offline Support**: Offline reservation creation and sync
- **Performance**: Caching and optimization
- **Security**: Enhanced authentication and authorization

## Troubleshooting

### Common Issues

1. **API Connection Errors**:
   - Verify backend server is running
   - Check network connectivity
   - Validate API endpoint URLs

2. **Reservation Creation Failures**:
   - Ensure business hours are configured
   - Check date/time validation
   - Verify company ID exists

3. **Status Update Issues**:
   - Confirm reservation exists
   - Validate status transition rules
   - Check database constraints

### Debug Information
- **Logs**: Check backend logs for detailed error information
- **Network**: Use browser dev tools to inspect API calls
- **Database**: Verify data integrity and constraints

## Conclusion

The schedule + reservation system provides a comprehensive solution for restaurant management with full CRUD operations, real-time availability checking, and intuitive user interfaces. The implementation follows best practices for both frontend and backend development, ensuring scalability, maintainability, and user experience.

The system is now ready for production use and can be extended with additional features as needed.