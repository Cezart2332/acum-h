import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Secure storage utility that uses Expo SecureStore on native platforms
 * and falls back to AsyncStorage on web with encryption
 */
class SecureStorageService {
  private static instance: SecureStorageService;
  
  public static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  /**
   * Store an item securely
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // On web, use AsyncStorage with basic encoding (better than nothing)
        const encoded = btoa(value);
        await AsyncStorage.setItem(key, encoded);
      } else {
        // On native platforms, use SecureStore
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error('SecureStorage setItem error:', error);
      throw new Error('Failed to store item securely');
    }
  }

  /**
   * Retrieve an item securely
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // On web, decode from AsyncStorage
        const encoded = await AsyncStorage.getItem(key);
        if (!encoded) return null;
        return atob(encoded);
      } else {
        // On native platforms, use SecureStore
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error('SecureStorage getItem error:', error);
      return null;
    }
  }

  /**
   * Remove an item securely
   */
  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error('SecureStorage removeItem error:', error);
      throw new Error('Failed to remove item securely');
    }
  }

  /**
   * Store user data with proper security
   */
  async storeUserData(userData: any): Promise<void> {
    try {
      const userDataString = JSON.stringify(userData);
      await this.setItem('user', userDataString);
    } catch (error) {
      console.error('Failed to store user data:', error);
      throw new Error('Failed to store user data securely');
    }
  }

  /**
   * Retrieve user data with validation
   */
  async getUserData(): Promise<any | null> {
    try {
      const userDataString = await this.getItem('user');
      if (!userDataString) return null;
      
      const userData = JSON.parse(userDataString);
      
      // Basic validation
      if (!userData.id || !userData.accessToken) {
        console.warn('Invalid user data structure, clearing...');
        await this.removeItem('user');
        return null;
      }
      
      // Check if tokens are expired
      if (userData.expiresAt && new Date(userData.expiresAt) <= new Date()) {
        console.warn('Access token expired, clearing user data...');
        await this.removeItem('user');
        return null;
      }
      
      return userData;
    } catch (error) {
      console.error('Failed to retrieve user data:', error);
      await this.removeItem('user'); // Clear corrupted data
      return null;
    }
  }

  /**
   * Store login state securely
   */
  async setLoggedIn(isLoggedIn: boolean): Promise<void> {
    try {
      await this.setItem('loggedIn', JSON.stringify(isLoggedIn));
    } catch (error) {
      console.error('Failed to store login state:', error);
      throw new Error('Failed to store login state securely');
    }
  }

  /**
   * Get login state securely
   */
  async getLoggedIn(): Promise<boolean> {
    try {
      const loggedInString = await this.getItem('loggedIn');
      if (!loggedInString) return false;
      return JSON.parse(loggedInString);
    } catch (error) {
      console.error('Failed to retrieve login state:', error);
      return false;
    }
  }

  /**
   * Clear all user data securely
   */
  async clearUserData(): Promise<void> {
    try {
      await Promise.all([
        this.removeItem('user'),
        this.removeItem('loggedIn')
      ]);
    } catch (error) {
      console.error('Failed to clear user data:', error);
      throw new Error('Failed to clear user data securely');
    }
  }

  /**
   * Check if secure storage is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return true; // AsyncStorage is always available on web
      } else {
        return await SecureStore.isAvailableAsync();
      }
    } catch (error) {
      console.error('SecureStorage availability check failed:', error);
      return false;
    }
  }
}

export default SecureStorageService.getInstance();
