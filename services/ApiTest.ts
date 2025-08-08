// Simple API test for debugging
import Constants from "expo-constants";

const API_BASE_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_BASE_URL ||
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL ||
  "https://api.acoomh.ro";

console.log("🔍 Testing API connection...");
console.log("API_BASE_URL:", API_BASE_URL);

// Simple fetch test
export const testApiConnection = async () => {
  try {
    console.log("🚀 Attempting to connect to:", `${API_BASE_URL}/health`);

    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // No SSL pinning or complex configurations for testing
    });

    console.log("📡 Response status:", response.status);
    console.log("📡 Response headers:", response.headers);

    if (response.ok) {
      const data = await response.json();
      console.log("✅ API connection successful:", data);
      return { success: true, data };
    } else {
      console.log("❌ API returned error status:", response.status);
      const errorText = await response.text();
      console.log("❌ Error response:", errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
  } catch (error) {
    console.log("❌ Network error:", error);
    return { success: false, error: error.message };
  }
};

// Test all basic endpoints
export const testAllEndpoints = async () => {
  const endpoints = [
    "/health",
    "/health/db",
    "/users",
    "/companies",
    "/events",
    "/locations",
  ];

  console.log("🧪 Testing all endpoints...");

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing: ${API_BASE_URL}${endpoint}`);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log(`📡 ${endpoint}: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${endpoint}: Success`, data);
      } else {
        const errorText = await response.text();
        console.log(`❌ ${endpoint}: Error - ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: Network error - ${error.message}`);
    }
  }
};

export default { testApiConnection, testAllEndpoints };
