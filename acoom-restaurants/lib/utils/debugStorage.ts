// Development utility to clear app storage
// Import this in any component and call clearAppData() to reset the app

import AsyncStorage from "@react-native-async-storage/async-storage";

export const clearAppData = async () => {
  try {
    await AsyncStorage.clear();
    console.log("✅ App data cleared successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to clear app data:", error);
    return false;
  }
};

export const logStorageData = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const data = await AsyncStorage.multiGet(keys);
    console.log("📱 Current storage data:");
    data.forEach(([key, value]) => {
      console.log(`  ${key}:`, value);
    });
  } catch (error) {
    console.error("Failed to log storage data:", error);
  }
};

export const debugStorage = {
  clear: clearAppData,
  log: logStorageData,
};
