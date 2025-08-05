import AsyncStorage from "@react-native-async-storage/async-storage";

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
      "sha256/b37fa1eaf7e0bd01e072e2c8b72c8d87a9caa8d17df07574f7b9dbc374cf4ab0", // Primary cert
      "sha256/df74829cc70e030531ca7acc8a54e0013d6cc805855a43ac5490ebc5b590c73e",
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
  user?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    profileImage?: string;
    scopes: string[];
  };
  company?: {
    id: number;
    name: string;
    email: string;
    description: string;
    cui: number;
    category: string;
    role: string;
    scopes: string[];
    createdAt: string;
    isActive: boolean;
  };
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  description?: string;
  cui?: string;
  category?: string;
}

class SecureStorageService {
  /**
   * Store authentication tokens securely
   */
  static async storeTokens(
    accessToken: string,
    refreshToken: string
  ): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        ["access_token", accessToken],
        ["refresh_token", refreshToken],
        ["token_stored_at", Date.now().toString()],
      ]);
    } catch (error) {
      console.error("Failed to store tokens:", error);
      throw new Error("Failed to store authentication tokens");
    }
  }

  /**
   * Retrieve stored access token
   */
  static async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem("access_token");
    } catch (error) {
      console.error("Failed to retrieve access token:", error);
      return null;
    }
  }

  /**
   * Retrieve stored refresh token
   */
  static async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem("refresh_token");
    } catch (error) {
      console.error("Failed to retrieve refresh token:", error);
      return null;
    }
  }

  /**
   * Clear all stored tokens
   */
  static async clearTokens(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        "access_token",
        "refresh_token",
        "token_stored_at",
        "company",
        "user",
        "loggedIn",
      ]);
    } catch (error) {
      console.error("Failed to clear tokens:", error);
    }
  }

  /**
   * Check if tokens are expired
   */
  static async areTokensExpired(): Promise<boolean> {
    try {
      const storedAt = await AsyncStorage.getItem("token_stored_at");
      if (!storedAt) return true;

      const tokenAge = Date.now() - parseInt(storedAt);
      const maxAge = 15 * 60 * 1000; // 15 minutes

      return tokenAge > maxAge;
    } catch (error) {
      console.error("Failed to check token expiration:", error);
      return true;
    }
  }
}

export class SecureApiService {
  private static accessToken: string | null = null;
  private static refreshToken: string | null = null;
  private static isRefreshing = false;
  private static refreshPromise: Promise<string | null> | null = null;

  /**
   * Initialize the service by loading stored tokens
   */
  static async initialize(): Promise<void> {
    this.accessToken = await SecureStorageService.getAccessToken();
    this.refreshToken = await SecureStorageService.getRefreshToken();
  }

  /**
   * Make a secure HTTP request with automatic token refresh
   */
  private static async makeSecureRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    let url = `${API_CONFIG.BASE_URL}${endpoint}`;

    // Ensure we have the latest tokens
    if (!this.accessToken) {
      await this.initialize();
    }

    // Add authentication header if token exists
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // Add any existing headers
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
      // Note: timeout is not part of standard RequestInit, will be handled by the fetch implementation
    };

    try {
      let response = await fetch(url, requestOptions);

      // If unauthorized and we have a refresh token, try to refresh
      if (response.status === 401 && this.refreshToken && !this.isRefreshing) {
        const newToken = await this.refreshAccessToken();

        if (newToken) {
          // Retry the request with new token
          headers["Authorization"] = `Bearer ${newToken}`;
          response = await fetch(url, { ...requestOptions, headers });
        }
      }

      const isSuccess = response.ok;
      let data: T | undefined;
      let error: string | undefined;

      try {
        const responseText = await response.text();
        if (responseText) {
          data = JSON.parse(responseText);
        }
      } catch (parseError) {
        error = `Failed to parse response: ${parseError}`;
      }

      if (!isSuccess && !error) {
        error = `HTTP ${response.status}: ${response.statusText}`;
      }

      return {
        data,
        error,
        status: response.status,
        success: isSuccess,
      };
    } catch (error) {
      console.error("SecureApiService request failed:", error);
      return {
        error:
          error instanceof Error ? error.message : "Network request failed",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Refresh the access token
   */
  private static async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private static async performTokenRefresh(): Promise<string | null> {
    if (!this.refreshToken) return null;

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;

        await SecureStorageService.storeTokens(
          data.accessToken,
          data.refreshToken
        );

        return this.accessToken;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
    }

    // If refresh failed, clear tokens
    await this.logout();
    return null;
  }

  /**
   * Company login with credentials
   */
  static async login(
    credentials: LoginRequest
  ): Promise<ApiResponse<AuthTokens>> {
    try {
      const response = await this.makeSecureRequest<AuthTokens>("/auth/company-login", {
        method: "POST",
        body: JSON.stringify({
          Email: credentials.username, // Using email for company login
          Password: credentials.password,
        }),
      });

      if (response.success && response.data) {
        // Store tokens securely
        await SecureStorageService.storeTokens(
          response.data.accessToken,
          response.data.refreshToken
        );

        this.accessToken = response.data.accessToken;
        this.refreshToken = response.data.refreshToken;

        // Handle both user and company responses
        let userData;
        if (response.data.company) {
          // Company login
          userData = {
            type: "Company",
            id: response.data.company.id,
            name: response.data.company.name,
            email: response.data.company.email,
            description: response.data.company.description,
            cui: response.data.company.cui,
            category: response.data.company.category,
            role: response.data.company.role,
            scopes: response.data.company.scopes,
            createdAt: response.data.company.createdAt,
            isActive: response.data.company.isActive,
          };
        } else if (response.data.user) {
          // User login (shouldn't happen in restaurant app, but handle it)
          userData = {
            type: "User",
            id: response.data.user.id,
            name: response.data.user.username,
            username: response.data.user.username,
            firstName: response.data.user.firstName,
            lastName: response.data.user.lastName,
            email: response.data.user.email,
            role: response.data.user.role,
            profileImage: response.data.user.profileImage,
            scopes: response.data.user.scopes,
          };
        } else {
          throw new Error("Invalid response: no user or company data");
        }

        await AsyncStorage.multiSet([
          ["company", JSON.stringify(userData)],
          ["user", JSON.stringify(userData)],
          ["loggedIn", JSON.stringify(true)],
        ]);
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
   * Company registration
   */
  static async register(
    companyData: RegisterRequest
  ): Promise<ApiResponse<AuthTokens>> {
    try {
      const response = await this.makeSecureRequest<AuthTokens>(
        "/auth/company-register",
        {
          method: "POST",
          body: JSON.stringify({
            Name: companyData.name,
            Email: companyData.email,
            Password: companyData.password,
            Description: companyData.description || "",
            Cui: companyData.cui || "",
            Category: companyData.category || "",
          }),
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

        // Handle both user and company responses
        let userData;
        if (response.data.company) {
          // Company registration
          userData = {
            type: "Company",
            id: response.data.company.id,
            name: response.data.company.name,
            email: response.data.company.email,
            description: response.data.company.description,
            cui: response.data.company.cui,
            category: response.data.company.category,
            role: response.data.company.role,
            scopes: response.data.company.scopes,
            createdAt: response.data.company.createdAt,
            isActive: response.data.company.isActive,
          };
        } else if (response.data.user) {
          // User registration (fallback)
          userData = {
            type: "User",
            id: response.data.user.id,
            name: response.data.user.username,
            username: response.data.user.username,
            firstName: response.data.user.firstName,
            lastName: response.data.user.lastName,
            email: response.data.user.email,
            role: response.data.user.role,
            profileImage: response.data.user.profileImage,
            scopes: response.data.user.scopes,
          };
        } else {
          throw new Error("Invalid response: no user or company data");
        }

        await AsyncStorage.multiSet([
          ["company", JSON.stringify(userData)],
          ["user", JSON.stringify(userData)],
          ["loggedIn", JSON.stringify(true)],
        ]);
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
   * Make authenticated API requests
   */
  static async authenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.makeSecureRequest<T>(endpoint, options);
  }

  /**
   * Get current company profile
   */
  static async getProfile(): Promise<ApiResponse<any>> {
    return this.makeSecureRequest("/auth/me");
  }

  /**
   * Logout and clear all tokens
   */
  static async logout(): Promise<void> {
    try {
      // Revoke tokens on server if possible
      if (this.refreshToken) {
        await this.makeSecureRequest("/auth/logout", {
          method: "POST",
          body: JSON.stringify({
            refreshToken: this.refreshToken,
          }),
        });
      }
    } catch (error) {
      console.error("Error during server logout:", error);
    } finally {
      // Clear local tokens regardless of server response
      this.accessToken = null;
      this.refreshToken = null;
      await SecureStorageService.clearTokens();
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    await this.initialize();

    if (!this.accessToken || !this.refreshToken) {
      return false;
    }

    // Check if tokens are expired
    const expired = await SecureStorageService.areTokensExpired();
    if (expired) {
      // Try to refresh
      const newToken = await this.refreshAccessToken();
      return newToken !== null;
    }

    return true;
  }

  /**
   * Generic GET request
   */
  static async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.authenticatedRequest<T>(endpoint, {
      method: "GET",
    });
  }

  /**
   * Generic POST request
   */
  static async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const options: RequestInit = {
      method: "POST",
    };

    if (data) {
      if (data instanceof FormData) {
        options.body = data;
        // Don't set Content-Type for FormData, let the browser set it
      } else {
        options.body = JSON.stringify(data);
        options.headers = {
          "Content-Type": "application/json",
        };
      }
    }

    return this.authenticatedRequest<T>(endpoint, options);
  }

  /**
   * Generic PUT request
   */
  static async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const options: RequestInit = {
      method: "PUT",
    };

    if (data) {
      if (data instanceof FormData) {
        options.body = data;
      } else {
        options.body = JSON.stringify(data);
        options.headers = {
          "Content-Type": "application/json",
        };
      }
    }

    return this.authenticatedRequest<T>(endpoint, options);
  }

  /**
   * Generic DELETE request
   */
  static async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.authenticatedRequest<T>(endpoint, {
      method: "DELETE",
    });
  }
}

export { SecureStorageService };
export default SecureApiService;
