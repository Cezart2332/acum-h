import { SecureApiService } from '../services/SecureApiService';

/**
 * Simple API testing utility for debugging connection issues
 */
export class ApiTester {
  static async runBasicTests(): Promise<void> {
    console.log("=== API Testing Started ===");
    
    try {
      // Test 1: Basic connectivity
      console.log("Test 1: Testing basic connectivity...");
      const connectivityResult = await SecureApiService.testConnectivity();
      console.log("Connectivity result:", connectivityResult);
      
      // Test 2: Simple GET request to a known endpoint
      console.log("Test 2: Testing simple GET request...");
      try {
        const response = await fetch("https://api.acoomh.ro/companies/1/locations", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "AcoomH-Test/1.0",
          },
        });
        
        console.log("Direct fetch response:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        });
        
        const text = await response.text();
        console.log("Raw response text:", text);
        console.log("Text length:", text.length);
        
        if (text.trim()) {
          try {
            const parsed = JSON.parse(text);
            console.log("Parsed JSON:", parsed);
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            console.error("Problematic text bytes:", Array.from(text).map(c => c.charCodeAt(0)));
          }
        }
      } catch (fetchError) {
        console.error("Direct fetch failed:", fetchError);
      }
      
      // Test 3: SecureApiService request
      console.log("Test 3: Testing SecureApiService request...");
      try {
        const secureResponse = await SecureApiService.makeSecureRequest("/companies/1/locations");
        console.log("SecureApiService response:", secureResponse);
      } catch (secureError) {
        console.error("SecureApiService request failed:", secureError);
      }
      
    } catch (error) {
      console.error("API testing failed:", error);
    }
    
    console.log("=== API Testing Completed ===");
  }
}
