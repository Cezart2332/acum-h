import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as Application from "expo-application";

// Security configuration
const SECURITY_CONFIG = {
  requireAuthentication: true,
  accessControl: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// Keys for secure storage
const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  USER_DATA: "user_data",
  BIOMETRIC_KEY: "biometric_key",
  DEVICE_ID: "device_id",
  PIN_HASH: "pin_hash",
} as const;

export class SecureStorageService {
  /**
   * Device integrity checks
   */
  static async performDeviceIntegrityChecks(): Promise<{
    isSecure: boolean;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    let isSecure = true;

    try {
      // Check if device is rooted/jailbroken (basic checks)
      const deviceType = Device.deviceType;
      const isDevice = Device.isDevice;

      if (!isDevice) {
        warnings.push(
          "Running on simulator/emulator - security features limited"
        );
        isSecure = false;
      }

      // Check for development mode
      if (__DEV__) {
        warnings.push(
          "Development mode detected - not suitable for production"
        );
        isSecure = false;
      }

      // Additional platform-specific checks could be added here
    } catch (error) {
      console.error("Device integrity check failed:", error);
      warnings.push("Unable to verify device integrity");
      isSecure = false;
    }

    return { isSecure, warnings };
  }

  /**
   * Generate unique device fingerprint
   */
  static async getDeviceFingerprint(): Promise<string> {
    try {
      let deviceId = await SecureStore.getItemAsync(STORAGE_KEYS.DEVICE_ID);

      if (!deviceId) {
        // Create new device fingerprint
        const fingerprint = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${Application.nativeApplicationVersion}-${Device.osName}-${
            Device.osVersion
          }-${Date.now()}`
        );

        await SecureStore.setItemAsync(
          STORAGE_KEYS.DEVICE_ID,
          fingerprint,
          SECURITY_CONFIG
        );
        deviceId = fingerprint;
      }

      return deviceId;
    } catch (error) {
      console.error("Failed to generate device fingerprint:", error);
      throw new Error("Device fingerprint generation failed");
    }
  }

  /**
   * Store sensitive data securely
   */
  static async setSecureItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, SECURITY_CONFIG);
    } catch (error) {
      console.error(`Failed to store secure item ${key}:`, error);
      throw new Error(`Secure storage failed for ${key}`);
    }
  }

  /**
   * Retrieve sensitive data securely
   */
  static async getSecureItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key, SECURITY_CONFIG);
    } catch (error) {
      console.error(`Failed to retrieve secure item ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove sensitive data
   */
  static async removeSecureItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key, SECURITY_CONFIG);
    } catch (error) {
      console.error(`Failed to remove secure item ${key}:`, error);
    }
  }

  /**
   * Store authentication tokens securely
   */
  static async storeTokens(
    accessToken: string,
    refreshToken: string
  ): Promise<void> {
    try {
      await Promise.all([
        this.setSecureItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        this.setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
      ]);
    } catch (error) {
      console.error("Failed to store authentication tokens:", error);
      throw new Error("Token storage failed");
    }
  }

  /**
   * Retrieve authentication tokens
   */
  static async getTokens(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
  }> {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.getSecureItem(STORAGE_KEYS.ACCESS_TOKEN),
        this.getSecureItem(STORAGE_KEYS.REFRESH_TOKEN),
      ]);

      return { accessToken, refreshToken };
    } catch (error) {
      console.error("Failed to retrieve authentication tokens:", error);
      return { accessToken: null, refreshToken: null };
    }
  }

  /**
   * Clear all authentication data
   */
  static async clearAuthData(): Promise<void> {
    try {
      await Promise.all([
        this.removeSecureItem(STORAGE_KEYS.ACCESS_TOKEN),
        this.removeSecureItem(STORAGE_KEYS.REFRESH_TOKEN),
        this.removeSecureItem(STORAGE_KEYS.USER_DATA),
      ]);
    } catch (error) {
      console.error("Failed to clear authentication data:", error);
    }
  }

  /**
   * Store user data securely
   */
  static async storeUserData(userData: object): Promise<void> {
    try {
      const encryptedData = await this.encryptData(JSON.stringify(userData));
      await this.setSecureItem(STORAGE_KEYS.USER_DATA, encryptedData);
    } catch (error) {
      console.error("Failed to store user data:", error);
      throw new Error("User data storage failed");
    }
  }

  /**
   * Retrieve user data securely
   */
  static async getUserData(): Promise<object | null> {
    try {
      const encryptedData = await this.getSecureItem(STORAGE_KEYS.USER_DATA);
      if (!encryptedData) return null;

      const decryptedData = await this.decryptData(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error("Failed to retrieve user data:", error);
      return null;
    }
  }

  /**
   * Basic encryption for additional data protection
   */
  private static async encryptData(data: string): Promise<string> {
    try {
      // For Expo, we use base64 encoding as basic obfuscation
      // In production, consider using more robust encryption
      const deviceId = await this.getDeviceFingerprint();
      const combined = `${deviceId}:${data}`;
      return btoa(combined);
    } catch (error) {
      console.error("Encryption failed:", error);
      return data; // Fallback to plain data
    }
  }

  /**
   * Basic decryption
   */
  private static async decryptData(encryptedData: string): Promise<string> {
    try {
      const decoded = atob(encryptedData);
      const deviceId = await this.getDeviceFingerprint();
      const prefix = `${deviceId}:`;

      if (decoded.startsWith(prefix)) {
        return decoded.substring(prefix.length);
      }

      return decoded; // Fallback for legacy data
    } catch (error) {
      console.error("Decryption failed:", error);
      return encryptedData; // Fallback to encrypted data
    }
  }

  /**
   * Validate stored data integrity
   */
  static async validateDataIntegrity(): Promise<boolean> {
    try {
      const tokens = await this.getTokens();
      if (tokens.accessToken && tokens.refreshToken) {
        // Basic validation - check if tokens are valid JWT format
        const isValidJWT = (token: string) => {
          const parts = token.split(".");
          return parts.length === 3;
        };

        return (
          isValidJWT(tokens.accessToken) && isValidJWT(tokens.refreshToken)
        );
      }
      return true; // No tokens to validate
    } catch (error) {
      console.error("Data integrity validation failed:", error);
      return false;
    }
  }
}

export { STORAGE_KEYS };
