import Constants from "expo-constants";
import { SecureStorageService } from "./SecureStorageService";

// Environment-specific configurations
const ENVIRONMENTS = {
  development: {
    apiBaseUrl: "https://api.acoomh.ro", // Use HTTPS - Traefik handles SSL termination
    enableLogging: true,
    enableDebugMode: true,
    sslPinningEnabled: false, // Disable SSL pinning for development
  },
  staging: {
    apiBaseUrl: "https://staging-api.acoomh.ro",
    enableLogging: true,
    enableDebugMode: false,
    sslPinningEnabled: true,
  },
  production: {
    apiBaseUrl: "https://api.acoomh.ro",
    enableLogging: false,
    enableDebugMode: false,
    sslPinningEnabled: true,
  },
} as const;

type Environment = keyof typeof ENVIRONMENTS;

// Security policies
const SECURITY_POLICIES = {
  // Minimum app version required
  minimumAppVersion: "1.0.0",

  // API timeouts
  apiTimeout: 30000,
  authTimeout: 10000,

  // Rate limiting
  maxRequestsPerMinute: 60,
  authAttemptsLimit: 5,

  // Token management
  tokenRefreshThreshold: 300000, // 5 minutes before expiry
  maxTokenAge: 86400000, // 24 hours

  // SSL/TLS settings
  tlsMinVersion: "1.2",
  certificatePinningEnabled: true,

  // Data protection
  encryptLocalData: true,
  autoLogoutTimeout: 900000, // 15 minutes

  // Biometric authentication
  biometricPromptTimeout: 30000,
  maxBiometricAttempts: 3,
} as const;

// Certificate pins for SSL pinning (actual certificate hashes for api.acoomh.ro)
const CERTIFICATE_PINS = {
  "api.acoomh.ro": [
    "sha256/b37fa1eaf7e0bd01e072e2c8b72c8d87a9caa8d17df07574f7b9dbc374cf4ab0", // Primary cert
    "sha256/df74829cc70e030531ca7acc8a54e0013d6cc805855a43ac5490ebc5b590c73e", // Public key pin
  ],
  "staging-api.acoomh.ro": [
    "sha256/b37fa1eaf7e0bd01e072e2c8b72c8d87a9caa8d17df07574f7b9dbc374cf4ab0",
  ],
} as const;

export class SecureConfigService {
  private static environment: Environment = "production";
  private static config: (typeof ENVIRONMENTS)[Environment] | null = null;
  private static isInitialized = false;

  /**
   * Initialize the configuration service
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Determine environment
      this.environment = this.determineEnvironment();
      this.config = ENVIRONMENTS[this.environment];

      // Validate app version and security requirements
      await this.validateSecurityRequirements();

      this.isInitialized = true;

      if (this.config.enableLogging) {
        console.log(
          `SecureConfigService initialized for ${this.environment} environment`
        );
      }
    } catch (error) {
      console.error("Failed to initialize SecureConfigService:", error);
      throw error;
    }
  }

  /**
   * Get API base URL
   */
  static getApiBaseUrl(): string {
    this.ensureInitialized();
    return this.config!.apiBaseUrl;
  }

  /**
   * Get security policies
   */
  static getSecurityPolicies() {
    return SECURITY_POLICIES;
  }

  /**
   * Get certificate pins for SSL pinning
   */
  static getCertificatePins(): typeof CERTIFICATE_PINS {
    return CERTIFICATE_PINS;
  }

  /**
   * Check if logging is enabled
   */
  static isLoggingEnabled(): boolean {
    this.ensureInitialized();
    return this.config!.enableLogging;
  }

  /**
   * Check if debug mode is enabled
   */
  static isDebugModeEnabled(): boolean {
    this.ensureInitialized();
    return this.config!.enableDebugMode;
  }

  /**
   * Check if SSL pinning is enabled
   */
  static isSslPinningEnabled(): boolean {
    this.ensureInitialized();
    return this.config!.sslPinningEnabled;
  }

  /**
   * Get current environment
   */
  static getEnvironment(): Environment {
    return this.environment;
  }

  /**
   * Check if running in production
   */
  static isProduction(): boolean {
    return this.environment === "production";
  }

  /**
   * Get API timeout configuration
   */
  static getApiTimeout(): number {
    return SECURITY_POLICIES.apiTimeout;
  }

  /**
   * Get authentication timeout
   */
  static getAuthTimeout(): number {
    return SECURITY_POLICIES.authTimeout;
  }

  /**
   * Validate that the app meets security requirements
   */
  private static async validateSecurityRequirements(): Promise<void> {
    // Check device integrity
    const integrityCheck =
      await SecureStorageService.performDeviceIntegrityChecks();

    if (!integrityCheck.isSecure && this.environment === "production") {
      // In production, we might want to be more strict
      console.warn(
        "Device integrity warnings detected:",
        integrityCheck.warnings
      );
    }

    // Check app version
    const currentVersion = Constants.expoConfig?.version || "0.0.0";
    if (
      this.isVersionLower(currentVersion, SECURITY_POLICIES.minimumAppVersion)
    ) {
      throw new Error(
        `App version ${currentVersion} is below minimum required version ${SECURITY_POLICIES.minimumAppVersion}`
      );
    }

    // Additional security validations can be added here
  }

  /**
   * Determine the current environment
   */
  private static determineEnvironment(): Environment {
    // Check if explicitly set in app.json extra config
    const envConfig = Constants.expoConfig?.extra?.environment;
    if (envConfig && envConfig in ENVIRONMENTS) {
      return envConfig as Environment;
    }

    // Check environment variables
    const envVar = process.env.EXPO_PUBLIC_ENVIRONMENT;
    if (envVar && envVar in ENVIRONMENTS) {
      return envVar as Environment;
    }

    // Determine based on app release channel or other factors
    const releaseChannel =
      Constants.expoConfig?.updates?.requestHeaders?.["expo-release-channel"];

    if (releaseChannel === "staging") {
      return "staging";
    }

    if (__DEV__ || releaseChannel === "development") {
      return "development";
    }

    // Default to production for safety
    return "production";
  }

  /**
   * Compare version strings
   */
  private static isVersionLower(version1: string, version2: string): boolean {
    const v1parts = version1.split(".").map(Number);
    const v2parts = version2.split(".").map(Number);

    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;

      if (v1part < v2part) return true;
      if (v1part > v2part) return false;
    }

    return false;
  }

  /**
   * Ensure the service is initialized
   */
  private static ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error("SecureConfigService must be initialized before use");
    }
  }

  /**
   * Get configuration for specific feature
   */
  static getFeatureConfig(feature: string): any {
    const extra = Constants.expoConfig?.extra || {};
    return extra[feature] || null;
  }

  /**
   * Securely store configuration that might change at runtime
   */
  static async setRuntimeConfig(key: string, value: string): Promise<void> {
    await SecureStorageService.setSecureItem(`config_${key}`, value);
  }

  /**
   * Retrieve runtime configuration
   */
  static async getRuntimeConfig(key: string): Promise<string | null> {
    return await SecureStorageService.getSecureItem(`config_${key}`);
  }
}

// Auto-initialize when imported
SecureConfigService.initialize().catch((error) => {
  console.error("Failed to auto-initialize SecureConfigService:", error);
});

export { SECURITY_POLICIES, CERTIFICATE_PINS };
export default SecureConfigService;
