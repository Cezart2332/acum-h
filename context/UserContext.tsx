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
      const userData = await SecureStorage.getUserData();
      const loggedInStatus = await SecureStorage.getLoggedIn();

      if (userData && loggedInStatus) {
        setUser(userData);
        setIsLoggedIn(loggedInStatus);
      }
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
      await Promise.all([
        SecureStorage.storeUserData(userData),
        SecureStorage.setLoggedIn(true),
      ]);

      setUser(userData);
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const logout = async () => {
    try {
      await SecureStorage.clearUserData();

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
