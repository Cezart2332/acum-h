import { BASE_URL } from "../config";

/**
 * Utility service for handling API calls with backward compatibility
 * between old and new API response formats
 */
class ApiCompatibilityService {
  
  /**
   * Normalize API response to handle both old (array) and new (paginated) formats
   */
  private static normalizeResponse<T>(response: T[] | { data: T[]; pagination?: any }): T[] {
    if (Array.isArray(response)) {
      // Old format: direct array
      return response;
    }
    
    if (response && typeof response === 'object' && 'data' in response) {
      // New format: paginated response
      return (response as { data: T[] }).data || [];
    }
    
    // Fallback: empty array
    return [];
  }

  /**
   * Fetch locations with automatic response normalization
   */
  static async fetchLocations(): Promise<any[]> {
    try {
      const response = await fetch(`${BASE_URL}/locations`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return this.normalizeResponse(data);
    } catch (error) {
      console.error("Error fetching locations:", error);
      throw error;
    }
  }

  /**
   * Fetch events with automatic response normalization
   */
  static async fetchEvents(): Promise<any[]> {
    try {
      const response = await fetch(`${BASE_URL}/events`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return this.normalizeResponse(data);
    } catch (error) {
      console.error("Error fetching events:", error);
      throw error;
    }
  }

  /**
   * Fetch companies (usually not paginated, but kept for consistency)
   */
  static async fetchCompanies(): Promise<any[]> {
    try {
      const response = await fetch(`${BASE_URL}/companies`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return this.normalizeResponse(data);
    } catch (error) {
      console.error("Error fetching companies:", error);
      throw error;
    }
  }

  /**
   * Generic fetch with response normalization
   */
  static async fetchData<T>(endpoint: string): Promise<T[]> {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return this.normalizeResponse<T>(data);
    } catch (error) {
      console.error(`Error fetching data from ${endpoint}:`, error);
      throw error;
    }
  }
}

export default ApiCompatibilityService;
