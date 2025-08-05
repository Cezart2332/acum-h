// Simple API wrapper for existing code compatibility
import RobustApiService from './RobustApiService';

/**
 * Simple fetch wrapper that automatically finds working API endpoint
 */
export const robustFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  // If URL is absolute, use it as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return fetch(url, options);
  }
  
  // If URL is relative, use RobustApiService
  const baseUrl = await RobustApiService.getBaseUrl();
  const fullUrl = `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
  
  console.log(`📡 Robust Fetch: ${fullUrl}`);
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    console.log(`📡 Response: ${fullUrl} - ${response.status}`);
    return response;
  } catch (error) {
    console.error(`❌ Fetch Error: ${fullUrl}`, error);
    throw error;
  }
};

/**
 * Get working base URL
 */
export const getWorkingBaseUrl = async (): Promise<string> => {
  return await RobustApiService.getBaseUrl();
};

/**
 * Test API connection
 */
export const testApiConnection = async (): Promise<boolean> => {
  try {
    const response = await robustFetch('/health');
    return response.ok;
  } catch (error) {
    console.error('API connection test failed:', error);
    return false;
  }
};

export default robustFetch;
