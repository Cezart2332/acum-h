import { getBaseUrl, BASE_URL } from "../config";
import type { LocationData, EventData } from "../screens/RootStackParamList";

interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface LocationPhoto {
  photo: string;
}

class OptimizedApiService {
  private static photoCache = new Map<number, string>();
  private static requestCache = new Map<string, any>();
  private static cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data or fetch new data
   */
  private static async getCachedOrFetch<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const data = await fetchFn();
    this.requestCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }

  /**
   * Get locations with pagination and filters
   */
  static async getLocations(
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<LocationData>> {
    const { page = 1, limit = 20, search, category } = params;
    
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());
    
    if (search) queryParams.append("search", search);
    if (category) queryParams.append("category", category);

    const cacheKey = `locations_${queryParams.toString()}`;

    return this.getCachedOrFetch(cacheKey, async () => {
      try {
        // Try optimized endpoint first
        const response = await fetch(`${BASE_URL}/locations?${queryParams}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Check if it's an error response
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Check if it's already paginated format
        if (data.data && data.pagination) {
          return data;
        }
        
        // If it's an array (old format), convert to paginated format
        if (Array.isArray(data)) {
          const filteredData = this.filterLocationsClientSide(data, search, category);
          const paginatedData = this.paginateArray(filteredData, page, limit);
          return {
            data: paginatedData,
            pagination: {
              page,
              limit,
              total: filteredData.length,
              totalPages: Math.ceil(filteredData.length / limit),
              hasNext: page * limit < filteredData.length,
              hasPrev: page > 1,
            },
          };
        }
        
        throw new Error("Unexpected response format");
      } catch (error) {
        // Fallback to old endpoint (reduce log noise)
        try {
          const response = await fetch(`${BASE_URL}/locations`);
          if (!response.ok) {
            throw new Error(`Fallback HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          
          if (data.error) {
            throw new Error(data.error);
          }
          
          // Convert old format to paginated
          const allData = Array.isArray(data) ? data : [];
          const filteredData = this.filterLocationsClientSide(allData, search, category);
          const paginatedData = this.paginateArray(filteredData, page, limit);
          
          return {
            data: paginatedData,
            pagination: {
              page,
              limit,
              total: filteredData.length,
              totalPages: Math.ceil(filteredData.length / limit),
              hasNext: page * limit < filteredData.length,
              hasPrev: page > 1,
            },
          };
        } catch (fallbackError) {
          // Both endpoints failed - this will be handled by the calling component
          throw new Error(`API unavailable`);
        }
      }
    });
  }

  /**
   * Get events with pagination and filters
   */
  static async getEvents(
    params: PaginationParams & { active?: boolean } = {}
  ): Promise<PaginatedResponse<EventData>> {
    const { page = 1, limit = 20, search, active = true } = params;
    
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());
    queryParams.append("active", active.toString());
    
    if (search) queryParams.append("search", search);

    const cacheKey = `events_${queryParams.toString()}`;

    return this.getCachedOrFetch(cacheKey, async () => {
      try {
        // Try optimized endpoint first
        const response = await fetch(`${BASE_URL}/events?${queryParams}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Check if it's an error response
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Check if it's already paginated format
        if (data.data && data.pagination) {
          return data;
        }
        
        // If it's an array (old format), convert to paginated format
        if (Array.isArray(data)) {
          const filteredData = this.filterEventsClientSide(data, search, active);
          const paginatedData = this.paginateArray(filteredData, page, limit);
          return {
            data: paginatedData,
            pagination: {
              page,
              limit,
              total: filteredData.length,
              totalPages: Math.ceil(filteredData.length / limit),
              hasNext: page * limit < filteredData.length,
              hasPrev: page > 1,
            },
          };
        }
        
        throw new Error("Unexpected response format");
      } catch (error) {
        // Fallback to old endpoint (reduce log noise)
        try {
          const response = await fetch(`${BASE_URL}/events`);
          if (!response.ok) {
            throw new Error(`Fallback HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          
          if (data.error) {
            throw new Error(data.error);
          }
          
          // Convert old format to paginated
          const allData = Array.isArray(data) ? data : [];
          const filteredData = this.filterEventsClientSide(allData, search, active);
          const paginatedData = this.paginateArray(filteredData, page, limit);
          
          return {
            data: paginatedData,
            pagination: {
              page,
              limit,
              total: filteredData.length,
              totalPages: Math.ceil(filteredData.length / limit),
              hasNext: page * limit < filteredData.length,
              hasPrev: page > 1,
            },
          };
        } catch (fallbackError) {
          // Log the actual error for debugging
          console.error("Both event endpoints failed:", {
            originalError: error.message,
            fallbackError: fallbackError.message
          });
          throw new Error(`Failed to fetch events: ${error.message}`);
        }
      }
    });
  }

  /**
   * Get location photo (with caching)
   */
  static async getLocationPhoto(locationId: number): Promise<string> {
    // Check cache first
    if (this.photoCache.has(locationId)) {
      return this.photoCache.get(locationId)!;
    }

    try {
      const baseUrl = await getBaseUrl();
      const url = `${baseUrl}/locations/${locationId}/photo`;
      const response = await fetch(url);
      if (!response.ok) {
        return "";
      }
      
      const data = await response.json();
      
      // Handle new photoUrl format
      if (data.photoUrl) {
        // Cache the photo URL
        this.photoCache.set(locationId, data.photoUrl);
        return data.photoUrl;
      }
      
      // Handle legacy base64 format
      if (data.photo) {
        const base64Photo = `data:image/jpeg;base64,${data.photo}`;
        this.photoCache.set(locationId, base64Photo);
        return base64Photo;
      }
      
      return "";
    } catch (error) {
      console.warn(`Failed to load photo for location ${locationId}:`, error);
      return "";
    }
  }

  /**
   * Preload photos for a batch of locations (background loading)
   */
  static async preloadPhotos(locationIds: number[]): Promise<void> {
    const uncachedIds = locationIds.filter(id => !this.photoCache.has(id));
    
    if (uncachedIds.length === 0) return;

    // Load photos in parallel but don't wait for all to complete
    const photoPromises = uncachedIds.map(id => 
      this.getLocationPhoto(id).catch(() => "") // Ignore errors
    );

    // Fire and forget - don't await all
    Promise.all(photoPromises);
  }

  /**
   * Clear caches (useful for refresh)
   */
  static clearCache(): void {
    this.requestCache.clear();
    this.photoCache.clear();
  }

  /**
   * Client-side filtering for locations (fallback when server-side filtering fails)
   */
  private static filterLocationsClientSide(
    locations: LocationData[],
    search?: string,
    category?: string
  ): LocationData[] {
    let filtered = [...locations];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (location) =>
          location.name?.toLowerCase().includes(searchLower) ||
          location.address?.toLowerCase().includes(searchLower) ||
          location.tags?.some((tag) => tag.toLowerCase().includes(searchLower)) ||
          location.category?.toLowerCase().includes(searchLower)
      );
    }

    if (category) {
      filtered = filtered.filter(
        (location) => location.category?.toLowerCase() === category.toLowerCase()
      );
    }

    return filtered;
  }

  /**
   * Client-side filtering for events (fallback when server-side filtering fails)
   */
  private static filterEventsClientSide(
    events: EventData[],
    search?: string,
    active?: boolean
  ): EventData[] {
    let filtered = [...events];

    if (active !== undefined) {
      filtered = filtered.filter((event) => event.isActive === active);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.title?.toLowerCase().includes(searchLower) ||
          event.description?.toLowerCase().includes(searchLower) ||
          event.address?.toLowerCase().includes(searchLower) ||
          event.city?.toLowerCase().includes(searchLower) ||
          event.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }

  /**
   * Client-side pagination helper
   */
  private static paginateArray<T>(array: T[], page: number, limit: number): T[] {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return array.slice(startIndex, endIndex);
  }

  /**
   * Get all locations (fallback to old behavior)
   */
  static async getAllLocations(): Promise<LocationData[]> {
    try {
      // Try to get all locations in batches
      let allLocations: LocationData[] = [];
      let page = 1;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await this.getLocations({ page, limit });
        allLocations = [...allLocations, ...response.data];
        hasMore = response.pagination.hasNext;
        page++;
        
        // Safety break to prevent infinite loops
        if (page > 50) break;
      }

      return allLocations;
    } catch (error) {
      console.warn("Failed to load locations, using fallback");
      // Fallback to original endpoint if available
      const response = await fetch(`${BASE_URL}/locations`);
      if (response.ok) {
        const data = await response.json();
        // Handle both old and new response formats
        return Array.isArray(data) ? data : data.data || [];
      }
      throw error;
    }
  }

  /**
   * Get all events (fallback to old behavior)
   */
  static async getAllEvents(): Promise<EventData[]> {
    try {
      let allEvents: EventData[] = [];
      let page = 1;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await this.getEvents({ page, limit });
        allEvents = [...allEvents, ...response.data];
        hasMore = response.pagination.hasNext;
        page++;
        
        if (page > 50) break;
      }

      return allEvents;
    } catch (error) {
      console.warn("Failed to load events, using fallback");
      const response = await fetch(`${BASE_URL}/events`);
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : data.data || [];
      }
      throw error;
    }
  }
}

export default OptimizedApiService;
