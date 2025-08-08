// Enhanced API service with fallback to mock data
import RobustApiService from "./RobustApiService";

// Mock data for when API endpoints are not available
const MOCK_DATA = {
  companies: [
    {
      id: 1,
      name: "Sample Restaurant",
      email: "contact@restaurant.com",
      description: "A sample restaurant for testing",
      cui: 12345678,
      category: "Restaurant",
    },
  ],

  events: [
    {
      id: 1,
      title: "Sample Event",
      description: "A sample event for testing",
      tags: ["food", "restaurant"],
      likes: 15,
      photo: "",
      company: "Sample Restaurant",
      eventDate: new Date().toISOString().split("T")[0],
      startTime: "18:00",
      endTime: "22:00",
      address: "123 Sample Street",
      city: "Sample City",
      latitude: 44.4268,
      longitude: 26.1025,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ],

  locations: [
    {
      id: 1,
      name: "Sample Location",
      address: "123 Sample Street, Sample City",
      category: "Restaurant",
      phoneNumber: "+40123456789",
      latitude: 44.4268,
      longitude: 26.1025,
      tags: ["food", "italian"],
      photo: "",
      menuName: "sample_menu.pdf",
      hasMenu: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],

  reservations: [],

  likedEvents: [],
};

class ApiServiceWithFallback {
  /**
   * Test if an endpoint exists
   */
  static async testEndpoint(endpoint: string): Promise<boolean> {
    try {
      const baseUrl = await RobustApiService.getBaseUrl();
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      // Consider 401 as "exists but needs auth"
      return response.status !== 404;
    } catch (error) {
      console.log(`❌ Endpoint test failed: ${endpoint}`, error);
      return false;
    }
  }

  /**
   * Get data with fallback to mock data
   */
  static async getWithFallback<T>(
    endpoint: string,
    mockDataKey: keyof typeof MOCK_DATA,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      console.log(`📡 Attempting to fetch: ${endpoint}`);

      // Try to get real data
      const data = await RobustApiService.get<T>(endpoint);
      console.log(`✅ Real data retrieved from: ${endpoint}`);
      return data;
    } catch (error) {
      console.log(
        `⚠️ API call failed for ${endpoint}, using mock data:`,
        error.message
      );

      // Fallback to mock data
      const mockData = MOCK_DATA[mockDataKey] as T;
      console.log(`🎭 Using mock data for: ${endpoint}`, mockData);
      return mockData;
    }
  }

  /**
   * Get companies with fallback
   */
  static async getCompanies() {
    return this.getWithFallback("/companies", "companies");
  }

  /**
   * Get events with fallback
   */
  static async getEvents() {
    return this.getWithFallback("/events", "events");
  }

  /**
   * Get locations with fallback
   */
  static async getLocations() {
    return this.getWithFallback("/locations", "locations");
  }

  /**
   * Get reservations with fallback
   */
  static async getReservations() {
    return this.getWithFallback("/reservations", "reservations");
  }

  /**
   * Get user liked events with fallback
   */
  static async getLikedEvents(userId: number) {
    return this.getWithFallback(`/users/${userId}/liked-events`, "likedEvents");
  }

  /**
   * Test API health
   */
  static async testHealth() {
    try {
      const healthData = await RobustApiService.get("/health");
      const dbData = await RobustApiService.get("/health/db");

      return {
        api: healthData,
        database: dbData,
        status: "healthy",
      };
    } catch (error) {
      console.error("Health check failed:", error);
      return {
        status: "unhealthy",
        error: error.message,
      };
    }
  }

  /**
   * Get API status and available endpoints
   */
  static async getApiStatus() {
    const endpoints = [
      "/health",
      "/health/db",
      "/users",
      "/companies",
      "/events",
      "/locations",
    ];
    const status: { [key: string]: boolean } = {};

    for (const endpoint of endpoints) {
      status[endpoint] = await this.testEndpoint(endpoint);
    }

    return {
      baseUrl: await RobustApiService.getBaseUrl(),
      endpoints: status,
      timestamp: new Date().toISOString(),
    };
  }
}

export default ApiServiceWithFallback;
export { MOCK_DATA };
