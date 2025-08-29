import AsyncStorage from "@react-native-async-storage/async-storage";
import { SecureStorageService } from "../services/SecureStorageService";
import SecureStorage from "./SecureStorage";

export class AuthenticationDebugger {
  /**
   * Log current authentication state for debugging
   */
  static async logAuthState(context: string = "Unknown"): Promise<void> {
    console.log(`=== Auth State Debug (${context}) ===`);
    
    try {
      // Extra verbose AsyncStorage checks for startup debugging
      try {
        console.log("Checking AsyncStorage for company data...");
        const allKeys = await AsyncStorage.getAllKeys();
        console.log("All AsyncStorage keys:", allKeys);

        const rawCompany = await AsyncStorage.getItem("company");
        const rawUser = await AsyncStorage.getItem("user");
        const rawLoggedIn = await AsyncStorage.getItem("loggedIn");

        console.log("Company data:", rawCompany ? "Found" : "Not found");
        console.log("User data:", rawUser ? "Found" : "Not found");
        console.log("Logged in status:", rawLoggedIn);
        console.log("Debugging: Raw AsyncStorage values:", {
          company: rawCompany,
          user: rawUser,
          loggedIn: rawLoggedIn,
        });

        if (!rawCompany && !rawUser) {
          console.log("No company/user data found in any storage location");
        }
      } catch (e) {
        console.warn("Failed to read raw AsyncStorage keys for debug:", e);
      }
      // Check UserContext tokens
      const userContextData = await SecureStorage.getUserData();
      const isLoggedIn = await SecureStorage.getLoggedIn();
      
      console.log("UserContext State:", {
        hasUserData: !!userContextData,
        isLoggedIn,
        hasAccessToken: !!(userContextData?.accessToken),
        hasRefreshToken: !!(userContextData?.refreshToken),
        tokenExpiry: userContextData?.expiresAt,
      });
      
      // Check SecureApiService tokens
      const secureTokens = await SecureStorageService.getTokens();
      
      console.log("SecureApiService State:", {
        hasAccessToken: !!secureTokens.accessToken,
        hasRefreshToken: !!secureTokens.refreshToken,
      });
      
      // Check if tokens match
      const tokensMatch = userContextData?.accessToken === secureTokens.accessToken &&
                         userContextData?.refreshToken === secureTokens.refreshToken;
      
      console.log("Token Sync Status:", {
        tokensMatch,
        userContextToken: userContextData?.accessToken?.substring(0, 20) + "...",
        secureApiToken: secureTokens.accessToken?.substring(0, 20) + "...",
      });
      
    } catch (error) {
      console.error("Auth state debug failed:", error);
    }
    
    console.log("=== End Auth State Debug ===");
  }
  
  /**
   * Clear all authentication data (for testing)
   */
  static async clearAllAuthData(): Promise<void> {
    try {
      await Promise.all([
        SecureStorage.clearUserData(),
        SecureStorageService.clearAuthData(),
      ]);
      console.log("All auth data cleared");
    } catch (error) {
      console.error("Failed to clear auth data:", error);
    }
  }
}
