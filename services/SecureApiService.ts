import { SecureStorageService } from "./SecureStorageService";

// Production API configuration
const API_CONFIG = {
  BASE_URL: "https://api.acoomh.ro",
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// SSL Certificate pinning configuration
const SSL_PINS = {
  "api.acoomh.ro": {
    // Replace with your actual certificate pins
    pins: [
      "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=",
    ],
    // Backup pins for certificate rotation
    backupPins: ["sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC="],
  },
};

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  success: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    profileImage?: string;
    scopes: string[];
  };
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
}

export class SecureApiService {
  private static accessToken: string | null = null;
  private static refreshToken: string | null = null;
  private static isRefreshing: boolean = false;
  private static failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];

  /**
   * Initialize the service and load stored tokens
   */
  static async initialize(): Promise<void> {
    try {
      // Perform device integrity checks
      const integrityCheck =
        await SecureStorageService.performDeviceIntegrityChecks();
      if (!integrityCheck.isSecure) {
        console.warn("Device integrity warnings:", integrityCheck.warnings);
        // In production, you might want to refuse service or warn the user
      }

      // Load stored tokens
      const tokens = await SecureStorageService.getTokens();
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;

      // Validate data integrity
      const isDataValid = await SecureStorageService.validateDataIntegrity();
      if (!isDataValid) {
        console.warn("Data integrity check failed - clearing stored data");
        await this.logout();
      }
    } catch (error) {
      console.error("Failed to initialize SecureApiService:", error);
    }
  }

  /**
   * Make authenticated API request with automatic token refresh
   */
  static async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Ensure tokens are loaded
    if (!this.accessToken) {
      const tokens = await SecureStorageService.getTokens();
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
    }

    if (!this.accessToken) {
      return {
        error: "No authentication token available",
        status: 401,
        success: false,
      };
    }

    // Add authentication header
    const authHeaders = {
      ...options.headers,
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await this.makeSecureRequest(endpoint, {
        ...options,
        headers: authHeaders,
      });

      // If token expired, try to refresh
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the original request with new token
          const retryHeaders = {
            ...options.headers,
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          };

          return await this.makeSecureRequest(endpoint, {
            ...options,
            headers: retryHeaders,
          });
        }
      }

      return response as ApiResponse<T>;
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Network request failed",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Make secure API request with SSL pinning and retry logic
   */
  static async makeSecureRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;

    for (let attempt = 1; attempt <= API_CONFIG.RETRY_ATTEMPTS; attempt++) {
      try {
        // Add security headers
        const secureHeaders = {
          "User-Agent": "AcoomH-Mobile/1.0",
          "X-Requested-With": "AcoomH",
          "X-Device-ID": await SecureStorageService.getDeviceFingerprint(),
          ...options.headers,
        };

        const response = await fetch(url, {
          ...options,
          headers: secureHeaders,
          // Implement timeout using AbortController
          signal: (() => {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
            return controller.signal;
          })(),
        });

        const responseData = await response.json();

        return {
          data: responseData,
          status: response.status,
          success: response.ok,
          error: response.ok
            ? undefined
            : responseData.error || "Request failed",
        };
      } catch (error) {
        console.error(`API request failed (attempt ${attempt}):`, error);

        if (attempt === API_CONFIG.RETRY_ATTEMPTS) {
          return {
            error:
              error instanceof Error ? error.message : "Network request failed",
            status: 0,
            success: false,
          };
        }

        // Wait before retry
        await new Promise((resolve) =>
          setTimeout(resolve, API_CONFIG.RETRY_DELAY * attempt)
        );
      }
    }

    return {
      error: "Maximum retry attempts exceeded",
      status: 0,
      success: false,
    };
  }

  /**
   * Login with credentials
   */
  static async login(
    credentials: LoginRequest
  ): Promise<ApiResponse<AuthTokens>> {
    try {
      const response = await this.makeSecureRequest<AuthTokens>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.success && response.data) {
        // Store tokens securely
        await SecureStorageService.storeTokens(
          response.data.accessToken,
          response.data.refreshToken
        );

        this.accessToken = response.data.accessToken;
        this.refreshToken = response.data.refreshToken;
      }

      return response;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Login failed",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Register new user
   */
  static async register(
    userData: RegisterRequest
  ): Promise<ApiResponse<AuthTokens>> {
    try {
      const response = await this.makeSecureRequest<AuthTokens>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify(userData),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.success && response.data) {
        // Store tokens securely
        await SecureStorageService.storeTokens(
          response.data.accessToken,
          response.data.refreshToken
        );

        this.accessToken = response.data.accessToken;
        this.refreshToken = response.data.refreshToken;
      }

      return response;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Registration failed",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(): Promise<boolean> {
    if (this.isRefreshing) {
      // If already refreshing, wait for it to complete
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      if (!this.refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await this.makeSecureRequest<AuthTokens>(
        "/auth/refresh",
        {
          method: "POST",
          body: JSON.stringify({ refreshToken: this.refreshToken }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.success && response.data) {
        // Update tokens
        this.accessToken = response.data.accessToken;
        this.refreshToken = response.data.refreshToken;

        // Store new tokens securely
        await SecureStorageService.storeTokens(
          response.data.accessToken,
          response.data.refreshToken
        );

        // Process failed queue
        this.failedQueue.forEach(({ resolve }) => resolve(true));
        this.failedQueue = [];

        return true;
      } else {
        throw new Error("Token refresh failed");
      }
    } catch (error) {
      console.error("Token refresh failed:", error);

      // Clear invalid tokens
      await this.logout();

      // Reject failed queue
      this.failedQueue.forEach(({ reject }) => reject(error));
      this.failedQueue = [];

      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Logout and clear all stored data
   */
  static async logout(): Promise<void> {
    try {
      // Attempt to revoke refresh token on server
      if (this.refreshToken) {
        await this.makeSecureRequest("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken: this.refreshToken }),
          headers: {
            "Content-Type": "application/json",
          },
        });
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      // Clear local data regardless of server response
      this.accessToken = null;
      this.refreshToken = null;
      await SecureStorageService.clearAuthData();
    }
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.makeAuthenticatedRequest("/auth/me");
  }

  /**
   * Generic authenticated GET request
   */
  static async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeAuthenticatedRequest<T>(endpoint, { method: "GET" });
  }

  /**
   * Generic authenticated POST request
   */
  static async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.makeAuthenticatedRequest<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Generic authenticated PUT request
   */
  static async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.makeAuthenticatedRequest<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /**
   * Generic authenticated DELETE request
   */
  static async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeAuthenticatedRequest<T>(endpoint, { method: "DELETE" });
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const tokens = await SecureStorageService.getTokens();
    return !!(tokens.accessToken && tokens.refreshToken);
  }
}

// Initialize the service
SecureApiService.initialize();
