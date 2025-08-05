// Robust API service with fallback URLs for development
import Constants from 'expo-constants';

// List of possible API endpoints to try in order
const POSSIBLE_API_URLS = [
  // Environment variable (highest priority)
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_BASE_URL,
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL,
  
  // Primary HTTPS endpoint (Traefik SSL termination)
  'https://api.acoomh.ro',
  
  // Coolify direct access patterns (for debugging)
  'http://rw4oowkk4c048co4g84soos0.188.214.88.28.sslip.io',
  'https://rw4oowkk4c048co4g84soos0.188.214.88.28.sslip.io',
  
  // Alternative ports (if needed)
  'https://api.acoomh.ro:443',
  'http://api.acoomh.ro:8080',
  'http://api.acoomh.ro:80',
  
  // Localhost fallbacks for development
  'http://localhost:5000',
  'http://localhost:8080',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:8080',
].filter(Boolean); // Remove null/undefined values

class RobustApiService {
  private static workingBaseUrl: string | null = null;
  private static isInitialized = false;

  /**
   * Find the first working API URL
   */
  static async initialize(): Promise<string> {
    if (this.workingBaseUrl && this.isInitialized) {
      return this.workingBaseUrl;
    }

    console.log('🔍 Searching for working API endpoint...');
    
    for (const url of POSSIBLE_API_URLS) {
      try {
        console.log(`🧪 Testing: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`${url}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`✅ Found working API: ${url}`);
          this.workingBaseUrl = url;
          this.isInitialized = true;
          return url;
        } else {
          console.log(`❌ ${url} returned status: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${url} failed: ${error.message}`);
      }
    }
    
    // If no URL works, use the first one as fallback
    const fallback = POSSIBLE_API_URLS[0] || 'http://localhost:5000';
    console.log(`⚠️ No working API found, using fallback: ${fallback}`);
    this.workingBaseUrl = fallback;
    this.isInitialized = true;
    return fallback;
  }

  /**
   * Get the working base URL
   */
  static async getBaseUrl(): Promise<string> {
    if (!this.workingBaseUrl || !this.isInitialized) {
      return await this.initialize();
    }
    return this.workingBaseUrl;
  }

  /**
   * Make an API request with automatic retry on different URLs
   */
  static async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const baseUrl = await this.getBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    try {
      console.log(`📡 API Request: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API Response: ${endpoint}`, data);
      return data;
    } catch (error) {
      console.error(`❌ API Error: ${endpoint}`, error);
      
      // If current URL fails, try to reinitialize with a different URL
      if (this.workingBaseUrl && POSSIBLE_API_URLS.length > 1) {
        console.log('🔄 Retrying with different URL...');
        this.workingBaseUrl = null;
        this.isInitialized = false;
        
        // Try once more with a new URL
        const newBaseUrl = await this.initialize();
        if (newBaseUrl !== baseUrl) {
          return await this.request(endpoint, options);
        }
      }
      
      throw error;
    }
  }

  /**
   * GET request
   */
  static async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  static async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  static async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  static async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Test all endpoints and return health status
   */
  static async testAllEndpoints(): Promise<{ [url: string]: boolean }> {
    const results: { [url: string]: boolean } = {};
    
    for (const url of POSSIBLE_API_URLS) {
      try {
        const response = await fetch(`${url}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        results[url] = response.ok;
      } catch (error) {
        results[url] = false;
      }
    }
    
    return results;
  }
}

export default RobustApiService;

// Auto-initialize when imported
RobustApiService.initialize().catch(error => {
  console.error('Failed to initialize RobustApiService:', error);
});
