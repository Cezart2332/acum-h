import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UserData {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
  type?: string;
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
      const [userData, loggedInStatus] = await Promise.all([
        AsyncStorage.getItem("user"),
        AsyncStorage.getItem("loggedIn"),
      ]);

      if (userData && loggedInStatus) {
        const parsedUser = JSON.parse(userData);
        const parsedLoggedIn = JSON.parse(loggedInStatus);

        setUser(parsedUser);
        setIsLoggedIn(parsedLoggedIn);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userData: UserData) => {
    try {
      await AsyncStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Error updating user data:", error);
    }
  };

  const updateProfileImage = async (imageBase64: string) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      profileImage: imageBase64,
    };

    try {
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error("Error updating profile image:", error);
    }
  };

  const login = async (userData: UserData) => {
    try {
      await Promise.all([
        AsyncStorage.setItem("user", JSON.stringify(userData)),
        AsyncStorage.setItem("loggedIn", JSON.stringify(true)),
      ]);

      setUser(userData);
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem("user"),
        AsyncStorage.removeItem("loggedIn"),
      ]);

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
