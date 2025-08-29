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
  category?: string;
  isActive?: string;
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
      // Diagnostic: log request and token state
      try {
        console.log("SecureApiService.request ->", {
          method: requestOptions.method || "GET",
          url,
          hasAccessToken: !!this.accessToken,
          hasRefreshToken: !!this.refreshToken,
          headersPreview: {
            Authorization: headers["Authorization"] ? "REDACTED" : undefined,
          },
        });
      } catch (e) {
        // ignore logging failures
      }

      let response = await fetch(url, requestOptions);

      // If unauthorized and we have a refresh token, try to refresh.
      // Note: allow waiting for an in-progress refresh to finish to avoid races.
      if (response.status === 401 && this.refreshToken) {
        console.log("SecureApiService: 401 received; refreshTokenPresent=", !!this.refreshToken, "isRefreshing=", !!this.isRefreshing);
        const refreshed = await this.refreshAccessToken();

        if (refreshed) {
          // Reload access token from secure storage
          const access = await SecureStorageService.getAccessToken();
          console.log("SecureApiService: refresh returned true, reloaded access token present=", !!access);
          if (access) {
            headers["Authorization"] = `Bearer ${access}`;
            response = await fetch(url, { ...requestOptions, headers });
          }
        } else {
          console.log("SecureApiService: refresh did not succeed; not retrying request");
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
  private static async refreshAccessToken(): Promise<boolean> {
    if (this.isRefreshing && this.refreshPromise) {
      // wait for existing refresh attempt
      try {
        await this.refreshPromise;
        return !!this.accessToken;
      } catch (e) {
        return false;
      }
    }

    this.isRefreshing = true;
    // reuse existing promise pattern but adapt to boolean result
    this.refreshPromise = (async () => {
      return await this.performTokenRefresh();
    })();

    try {
      const result = await this.refreshPromise;
      return !!result;
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
      console.log("SecureApiService.performTokenRefresh: sending refresh request, refreshTokenPresent=", !!this.refreshToken, "refreshTokenPrefix=", this.refreshToken ? `${this.refreshToken.substring(0,8)}...` : null);
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
        console.log("SecureApiService.performTokenRefresh: refresh OK, storing new tokens");
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;

        await SecureStorageService.storeTokens(
          data.accessToken,
          data.refreshToken
        );

        return this.accessToken;
      } else {
        // Log response body for debugging when refresh endpoint returns non-OK
        let respText = "";
        try {
          respText = await response.text();
        } catch (e) {
          respText = `<failed to read response body: ${e}>`;
        }
        console.error("SecureApiService.performTokenRefresh: refresh endpoint returned non-OK status", response.status, response.statusText, "body:", respText);
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
    }

    // If refresh failed, log and force logout to avoid silent stale state.
    try {
      console.log("SecureApiService.performTokenRefresh: refresh failed, forcing logout and clearing tokens");
      await this.logout();
    } catch (e) {
      console.error("Error forcing logout after failed refresh:", e);
    }

    return null;
  }

  /**
   * Company login with credentials
   */
  static async login(
    credentials: LoginRequest
  ): Promise<ApiResponse<AuthTokens>> {
    try {
      console.log("SecureApiService.login: Starting login process");
      console.log("SecureApiService.login: Credentials", {
        username: credentials.username,
        passwordLength: credentials.password.length,
      });

      const response = await this.makeSecureRequest<AuthTokens>(
        "/auth/company-login",
        {
          method: "POST",
          body: JSON.stringify({
            Email: credentials.username, // Using email for company login
            Password: credentials.password,
          }),
        }
      );

      console.log("SecureApiService.login: API response", {
        success: response.success,
        status: response.status,
        hasData: !!response.data,
        error: response.error,
      });

      if (response.success && response.data) {
        console.log("SecureApiService.login: Login successful, storing tokens");

        // Store tokens securely
        try {
          await SecureStorageService.storeTokens(
            response.data.accessToken,
            response.data.refreshToken
          );
          console.log("SecureApiService.login: Tokens stored successfully");
        } catch (tokenError) {
          console.error(
            "SecureApiService.login: Failed to store tokens",
            tokenError
          );
          throw tokenError;
        }

        this.accessToken = response.data.accessToken;
        this.refreshToken = response.data.refreshToken;

        console.log("SecureApiService.login: Processing user data");
        console.log("SecureApiService.login: Response data structure", {
          hasCompany: !!response.data.company,
          hasUser: !!response.data.user,
          companyKeys: response.data.company
            ? Object.keys(response.data.company)
            : [],
          userKeys: response.data.user ? Object.keys(response.data.user) : [],
        });

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
          console.log(
            "SecureApiService.login: Company data prepared",
            userData
          );
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
          console.log("SecureApiService.login: User data prepared", userData);
        } else {
          console.error(
            "SecureApiService.login: No user or company data in response"
          );
          throw new Error("Invalid response: no user or company data");
        }

        console.log(
          "SecureApiService.login: Storing user data to AsyncStorage"
        );
        try {
          // First, let's test if AsyncStorage is working at all
          console.log("Testing basic AsyncStorage functionality...");
          await AsyncStorage.setItem("test_key", "test_value");
          const testResult = await AsyncStorage.getItem("test_key");
          console.log("AsyncStorage test result:", testResult);

          if (testResult !== "test_value") {
            throw new Error("AsyncStorage is not functioning properly!");
          }

          // Clear test data
          await AsyncStorage.removeItem("test_key");

          console.log(
            "AsyncStorage test passed, proceeding with actual data storage..."
          );

          // Try individual storage operations instead of multiSet
          console.log("Storing company data...");
          await AsyncStorage.setItem("company", JSON.stringify(userData));
          console.log("Company data stored");

          console.log("Storing user data...");
          await AsyncStorage.setItem("user", JSON.stringify(userData));
          console.log("User data stored");

          // Also persist to SecureStorage for reliable session restore
          try {
            const SecureStorage = require("../../utils/SecureStorage").default;
            await SecureStorage.storeUserData(userData);
            await SecureStorage.setLoggedIn(true);
            console.log("SecureStorage: user data stored");
          } catch (e) {
            console.warn("SecureStorage: failed to store user data:", e);
          }

          console.log("Storing loggedIn status...");
          await AsyncStorage.setItem("loggedIn", JSON.stringify(true));
          console.log("LoggedIn status stored");

          console.log(
            "SecureApiService.login: AsyncStorage data stored successfully"
          );

          // Verify storage immediately with individual gets
          console.log("Verifying individual storage...");
          const companyCheck = await AsyncStorage.getItem("company");
          const userCheck = await AsyncStorage.getItem("user");
          const loggedInCheck = await AsyncStorage.getItem("loggedIn");

          console.log("SecureApiService.login: Individual verification check", {
            company: companyCheck ? "Found" : "Not found",
            user: userCheck ? "Found" : "Not found",
            loggedIn: loggedInCheck,
          });

          // Also check all keys to see what's actually stored
          const allKeys = await AsyncStorage.getAllKeys();
          console.log(
            "SecureApiService.login: All AsyncStorage keys after storage:",
            allKeys
          );

          // Wait a moment and check again
          console.log("Waiting 200ms and checking again...");
          await new Promise((resolve) => setTimeout(resolve, 200));

          const finalCompanyCheck = await AsyncStorage.getItem("company");
          const finalUserCheck = await AsyncStorage.getItem("user");
          const finalLoggedInCheck = await AsyncStorage.getItem("loggedIn");
          const finalAllKeys = await AsyncStorage.getAllKeys();

          console.log("SecureApiService.login: FINAL verification check", {
            company: finalCompanyCheck ? "Found" : "Not found",
            user: finalUserCheck ? "Found" : "Not found",
            loggedIn: finalLoggedInCheck,
            allKeys: finalAllKeys,
          });
        } catch (storageError) {
          console.error(
            "SecureApiService.login: Failed to store to AsyncStorage",
            storageError
          );
          throw storageError;
        }
      }

      console.log("SecureApiService.login: Returning response");
      return response;
    } catch (error) {
      console.error("SecureApiService.login: Login failed with error", error);
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
            Category: companyData.category || "",
            IsActive: companyData.isActive || "0",
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
   * Company registration with file upload
   */
  static async registerWithFile(
    formData: FormData
  ): Promise<ApiResponse<AuthTokens>> {
    try {
      console.log(
        "SecureApiService.registerWithFile: Starting registration process"
      );

      let url = `${API_CONFIG.BASE_URL}/auth/company-register`;

      // Ensure we have the latest tokens
      if (!this.accessToken) {
        await this.initialize();
      }

      // Diagnostic logging for uploads
      try {
        console.log("SecureApiService.registerWithFile ->", {
          url,
          hasAccessToken: !!this.accessToken,
          hasRefreshToken: !!this.refreshToken,
        });
      } catch (e) {
        // ignore logging issues
      }

      // For FormData, don't set Content-Type header - let the browser set the proper multipart boundary
      const headers: Record<string, string> = {
        Accept: "application/json",
      };

      if (this.accessToken) {
        headers["Authorization"] = `Bearer ${this.accessToken}`;
      }

      const requestOptions: RequestInit = {
        method: "POST",
        headers,
        body: formData,
      };

      console.log("SecureApiService.registerWithFile: Making API request");
      let response = await fetch(url, requestOptions);

      // If unauthorized and we have a refresh token, try to refresh.
      // Allow waiting for an in-progress refresh to avoid duplicate refresh requests.
      if (response.status === 401 && this.refreshToken) {
        console.log(
          "SecureApiService.registerWithFile: Unauthorized; refreshTokenPresent=",
          !!this.refreshToken,
          "isRefreshing=",
          !!this.isRefreshing
        );
        const refreshed = await this.refreshAccessToken();

        if (refreshed) {
          const access = await SecureStorageService.getAccessToken();
          if (access) {
            headers["Authorization"] = `Bearer ${access}`;
            response = await fetch(url, { ...requestOptions, headers });
          }
        } else {
          console.log("SecureApiService.registerWithFile: refresh did not succeed; not retrying");
        }
      }

      const isSuccess = response.ok;
      let data: AuthTokens | undefined;
      let error: string | undefined;

      console.log("SecureApiService.registerWithFile: Processing response", {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      });

      try {
        const responseText = await response.text();
        console.log(
          "SecureApiService.registerWithFile: Response text length",
          responseText.length
        );
        if (responseText) {
          data = JSON.parse(responseText);
          console.log(
            "SecureApiService.registerWithFile: Parsed response data",
            {
              hasData: !!data,
              hasCompany: !!(data as any)?.company,
              hasUser: !!(data as any)?.user,
              hasAccessToken: !!(data as any)?.accessToken,
              hasRefreshToken: !!(data as any)?.refreshToken,
            }
          );
        }
      } catch (parseError) {
        console.error(
          "SecureApiService.registerWithFile: Failed to parse response",
          parseError
        );
        error = `Failed to parse response: ${parseError}`;
      }

      if (!isSuccess && !error) {
        error = `HTTP ${response.status}: ${response.statusText}`;
        console.error("SecureApiService.registerWithFile: HTTP error", error);
      }

      if (isSuccess && data) {
        console.log(
          "SecureApiService.registerWithFile: Registration successful, storing tokens"
        );

        // Store tokens securely
        try {
          await SecureStorageService.storeTokens(
            data.accessToken,
            data.refreshToken
          );
          console.log(
            "SecureApiService.registerWithFile: Tokens stored successfully"
          );
        } catch (tokenError) {
          console.error(
            "SecureApiService.registerWithFile: Failed to store tokens",
            tokenError
          );
          throw tokenError;
        }

        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;

        console.log("SecureApiService.registerWithFile: Processing user data");
        console.log(
          "SecureApiService.registerWithFile: Response data structure",
          {
            hasCompany: !!data.company,
            hasUser: !!data.user,
            companyKeys: data.company ? Object.keys(data.company) : [],
            userKeys: data.user ? Object.keys(data.user) : [],
          }
        );

        // Handle both user and company responses
        let userData;
        if (data.company) {
          // Company registration
          userData = {
            type: "Company",
            id: data.company.id,
            name: data.company.name,
            email: data.company.email,
            description: data.company.description,
            cui: data.company.cui,
            category: data.company.category,
            role: data.company.role,
            scopes: data.company.scopes,
            createdAt: data.company.createdAt,
            isActive: data.company.isActive,
          };
          console.log(
            "SecureApiService.registerWithFile: Company data prepared",
            userData
          );
        } else if (data.user) {
          // User registration (fallback)
          userData = {
            type: "User",
            id: data.user.id,
            name: data.user.username,
            username: data.user.username,
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            email: data.user.email,
            role: data.user.role,
            profileImage: data.user.profileImage,
            scopes: data.user.scopes,
          };
          console.log(
            "SecureApiService.registerWithFile: User data prepared",
            userData
          );
        } else {
          console.error(
            "SecureApiService.registerWithFile: No user or company data in response"
          );
          throw new Error("Invalid response: no user or company data");
        }

        console.log(
          "SecureApiService.registerWithFile: Storing user data to AsyncStorage"
        );
        try {
          await AsyncStorage.multiSet([
            ["company", JSON.stringify(userData)],
            ["user", JSON.stringify(userData)],
            ["loggedIn", JSON.stringify(true)],
          ]);
          console.log(
            "SecureApiService.registerWithFile: AsyncStorage data stored successfully"
          );

          // Verify storage immediately
          const verification = await AsyncStorage.multiGet([
            "company",
            "user",
            "loggedIn",
          ]);
          console.log("SecureApiService.registerWithFile: Verification check", {
            company: verification[0][1] ? "Found" : "Not found",
            user: verification[1][1] ? "Found" : "Not found",
            loggedIn: verification[2][1],
          });
          try {
            const SecureStorage = require("../../utils/SecureStorage").default;
            await SecureStorage.storeUserData(userData);
            await SecureStorage.setLoggedIn(true);
            console.log("SecureStorage: user data stored (registerWithFile)");
          } catch (e) {
            console.warn("SecureStorage: failed to store user data (registerWithFile):", e);
          }
        } catch (storageError) {
          console.error(
            "SecureApiService.registerWithFile: Failed to store to AsyncStorage",
            storageError
          );
          throw storageError;
        }
      }

      return {
        data,
        error,
        status: response.status,
        success: isSuccess,
      };
    } catch (error) {
      console.error(
        "SecureApiService.registerWithFile: Registration failed with error",
        error
      );
      return {
        error:
          error instanceof Error
            ? error.message
            : "Registration with file failed",
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
   * Get current company or user profile
   */
  static async getProfile(): Promise<ApiResponse<any>> {
    try {
      // Check stored user data to determine if this is a company or user
      const storedCompany = await AsyncStorage.getItem("company");
      const storedUser = await AsyncStorage.getItem("user");

      let userType = "User"; // default

      if (storedCompany) {
        try {
          const companyData = JSON.parse(storedCompany);
          if (companyData.type === "Company") {
            userType = "Company";
          }
        } catch (e) {
          // Ignore parse errors, fallback to User
        }
      } else if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData.type === "Company") {
            userType = "Company";
          }
        } catch (e) {
          // Ignore parse errors, fallback to User
        }
      }

      // Use the appropriate endpoint based on user type
      const endpoint = userType === "Company" ? "/auth/company-me" : "/auth/me";
      return this.makeSecureRequest(endpoint);
    } catch (error) {
      // Fallback to /auth/me if there's any error determining user type
      return this.makeSecureRequest("/auth/me");
    }
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
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // reload access token into memory
        this.accessToken = await SecureStorageService.getAccessToken();
        this.refreshToken = await SecureStorageService.getRefreshToken();
        return !!this.accessToken;
      }
      return false;
    }

    return true;
  }

  /**
   * Generic GET request
   */
  static async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeSecureRequest<T>(endpoint, {
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

    return this.makeSecureRequest<T>(endpoint, options);
  }

  /**
   * Generic POST multipart/form-data request
   * This method intentionally avoids setting Content-Type so the runtime
   * can attach the proper multipart boundary.
   */
  static async postForm<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    try {
      let url = `${API_CONFIG.BASE_URL}${endpoint}`;

      // Ensure we have the latest tokens
      if (!this.accessToken) {
        await this.initialize();
      }

      // Diagnostic logging for postForm
      try {
        console.log("SecureApiService.postForm ->", {
          endpointUrl: url,
          hasAccessToken: !!this.accessToken,
          hasRefreshToken: !!this.refreshToken,
        });
      } catch (e) {
        // ignore logging issues
      }

      // For FormData, don't set Content-Type - let the runtime set the multipart boundary
      const headers: Record<string, string> = {
        Accept: "application/json",
      };

      if (this.accessToken) {
        headers["Authorization"] = `Bearer ${this.accessToken}`;
      }

      const requestOptions: RequestInit = {
        method: "POST",
        headers,
        body: formData,
      };

      let response = await fetch(url, requestOptions);

      // If unauthorized and we have a refresh token, try to refresh.
      // Allow awaiting an in-progress refresh to avoid race conditions.
      if (response.status === 401 && this.refreshToken) {
        console.log("SecureApiService.postForm: Unauthorized; refreshTokenPresent=", !!this.refreshToken, "isRefreshing=", !!this.isRefreshing);
        const refreshed = await this.refreshAccessToken();

        if (refreshed) {
          const access = await SecureStorageService.getAccessToken();
          if (access) {
            headers["Authorization"] = `Bearer ${access}`;
            response = await fetch(url, { ...requestOptions, headers });
          }
        } else {
          console.log("SecureApiService.postForm: refresh did not succeed; not retrying");
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
      console.error("SecureApiService.postForm failed:", error);
      return {
        error: error instanceof Error ? error.message : "Network request failed",
        status: 0,
        success: false,
      };
    }
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

    return this.makeSecureRequest<T>(endpoint, options);
  }

  /**
   * Generic DELETE request
   */
  static async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeSecureRequest<T>(endpoint, {
      method: "DELETE",
    });
  }
}

export { SecureStorageService };
export default SecureApiService;
