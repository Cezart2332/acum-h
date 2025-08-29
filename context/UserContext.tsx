import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../config";
import SecureStorage from "../utils/SecureStorage";
import { SecureApiService } from "../services/SecureApiService";
import { SecureStorageService } from "../services/SecureStorageService";
import { AuthenticationDebugger } from "../utils/AuthenticationDebugger";

interface UserData {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
  type?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
}

interface UserContextType {
  user: UserData | null;
  isLoggedIn: boolean;
  loading: boolean;
  updateUser: (userData: UserData) => Promise<void>;
  updateProfileImage: (imageBase64: string) => Promise<void>;
  login: (userData: UserData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load user data from AsyncStorage on app start
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      await AuthenticationDebugger.logAuthState("UserContext loadUserData - Start");
      // Prefer directly checking stored tokens to avoid stale 'loggedIn' flags
      let tokens = await SecureStorageService.getTokens();
      const storedUser = await SecureStorage.getUserData();
      const storedLoggedIn = await SecureStorage.getLoggedIn();

      // If SecureStorageService has no tokens but the stored user object contains tokens,
      // sync them into SecureStorageService so SecureApiService can initialize properly.
      if ((!tokens.accessToken || !tokens.refreshToken) && storedUser && (storedUser as any).accessToken && (storedUser as any).refreshToken) {
        try {
          console.log("UserContext: syncing tokens from storedUser into SecureStorageService");
          await SecureStorageService.storeTokens((storedUser as any).accessToken, (storedUser as any).refreshToken);
          tokens = await SecureStorageService.getTokens();
          console.log("UserContext: token sync complete");
        } catch (e) {
          console.warn("UserContext: failed to sync tokens into SecureStorageService:", e);
        }
      }

      // If still no tokens, ensure any stale flags are cleared and treat user as logged out
      if (!tokens.accessToken || !tokens.refreshToken) {
        console.log("No stored tokens found - clearing any stale login state");
        // Clear any stale user data / loggedIn flags
        try {
          await SecureStorage.clearUserData();
        } catch (e) {
          console.warn("Failed to clear legacy user data:", e);
        }
        try {
          await SecureStorageService.clearAuthData();
        } catch (e) {
          console.warn("Failed to clear secure auth data:", e);
        }

        setUser(null);
        setIsLoggedIn(false);
        await AuthenticationDebugger.logAuthState("UserContext loadUserData - No tokens, exit");
        setLoading(false);
        return;
      }

      // We have tokens — initialize API client and validate them
      await SecureApiService.initialize();

      try {
        const validation = await SecureApiService.getCurrentUser();
        if (!validation.success) {
          console.log("Token validation failed, clearing auth state");
          await SecureStorageService.clearAuthData();
          await SecureStorage.clearUserData();
          setUser(null);
          setIsLoggedIn(false);
          setLoading(false);
          return;
        }

        // If we have a stored user object prefer that, otherwise use server response
        const finalUser = storedUser || (validation.data as any) || null;
        if (finalUser) {
          setUser(finalUser as any);
          try {
            // Mirror into legacy AsyncStorage keys so older screens still find the user
            await AsyncStorage.setItem("user", JSON.stringify(finalUser));
            await AsyncStorage.setItem("loggedIn", JSON.stringify(true));
            console.log("UserContext: mirrored user into AsyncStorage for legacy compatibility");
          } catch (e) {
            console.warn("UserContext: failed to mirror user into AsyncStorage:", e);
          }
        }

        // Mark logged in only after tokens validated
        await SecureStorage.setLoggedIn(true);
        setIsLoggedIn(true);
      } catch (error) {
        console.error("Error validating tokens:", error);
        await SecureStorageService.clearAuthData();
        await SecureStorage.clearUserData();
        setUser(null);
        setIsLoggedIn(false);
      }
      
      await AuthenticationDebugger.logAuthState("UserContext loadUserData - End");
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userData: UserData) => {
    try {
      await SecureStorage.storeUserData(userData);
      setUser(userData);
    } catch (error) {
      console.error("Error updating user data:", error);
    }
  };

  const updateProfileImage = async (imageBase64: string) => {
    if (!user) {
      console.log("No user found for profile image update");
      return;
    }

    console.log("Updating profile image for user:", user.id);
    console.log("Image base64 length:", imageBase64?.length || 0);

    try {
      // For React Native, we need to create a file URI and use it directly
      // First, let's try a simpler approach by using the working Profile-Enhanced logic

      // Create a temporary file URI approach
      const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

      // Create the form data using the approach that works in Profile-Enhanced
      const form = new FormData();
      form.append("id", user.id.toString());

      // Use the base64 data directly as a file-like object for React Native
      form.append("file", {
        uri: `data:image/jpeg;base64,${base64Data}`,
        name: "profile.jpg",
        type: "image/jpeg",
      } as any);

      console.log("FormData created with id:", user.id);
      console.log("Uploading profile image to backend...");

      const response = await fetch(`${BASE_URL}/changepfp`, {
        method: "PUT",
        body: form,
        // Don't set Content-Type header for FormData - let it set the boundary
      });

      console.log("Backend response status:", response.status);

      if (response.ok) {
        console.log("Profile image uploaded successfully");
        const updatedUser = {
          ...user,
          profileImage: imageBase64,
        };

        await SecureStorage.storeUserData(updatedUser);
        setUser(updatedUser);
      } else {
        const errorText = await response.text();
        console.error("Backend upload failed:", response.status, errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }
    } catch (error) {
      console.error("Error updating profile image:", error);
      throw error;
    }
  };

  const login = async (userData: UserData) => {
    try {
      await AuthenticationDebugger.logAuthState("UserContext login - Start");
      
      await Promise.all([
        SecureStorage.storeUserData(userData),
        SecureStorage.setLoggedIn(true),
      ]);

      // Store tokens in SecureStorageService for SecureApiService
      if (userData.accessToken && userData.refreshToken) {
        await SecureStorageService.storeTokens(
          userData.accessToken,
          userData.refreshToken
        );
        // Initialize SecureApiService with the new tokens
        await SecureApiService.initialize();
      }

      setUser(userData);
      setIsLoggedIn(true);
      
      await AuthenticationDebugger.logAuthState("UserContext login - End");
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const logout = async () => {
    try {
      // Logout from SecureApiService first to revoke tokens on server
      try {
        await SecureApiService.logout();
      } catch (error) {
        console.error("SecureApiService logout failed:", error);
      }
      
      // Always clear local secure and legacy storage to avoid stale state
      try {
        await SecureStorageService.clearAuthData();
      } catch (error) {
        console.error("SecureApiService clearAuthData failed:", error);
      }

      try {
        await SecureStorage.clearUserData();
      } catch (error) {
        console.error("SecureStorage clearUserData failed:", error);
      }

      // Also ensure the SecureApiService internal tokens are nulled
      try {
        // Force re-initialize so other modules see tokens cleared
        await SecureApiService.initialize();
      } catch (e) {
        // Ignore
      }

      setUser(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const refreshUser = async () => {
    await loadUserData();
  };

  const value: UserContextType = {
    user,
    isLoggedIn,
    loading,
    updateUser,
    updateProfileImage,
    login,
    logout,
    refreshUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
