interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private pendingRequests = new Map<string, Promise<any>>();

  constructor(config: CacheConfig = { defaultTTL: 5 * 60 * 1000, maxSize: 100 }) {
    this.config = config;
    this.startCleanupInterval();
  }

  private startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }

  private cleanup() {
    const now = Date.now();
    const keysToDelete: string[] = [];

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    // If cache is still too large, remove oldest entries
    if (this.cache.size > this.config.maxSize) {
      const remainingEntries = Array.from(this.cache.entries());
      remainingEntries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = remainingEntries.slice(0, this.cache.size - this.config.maxSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  private generateCacheKey(url: string, options?: any): string {
    return `${url}:${JSON.stringify(options || {})}`;
  }

  async get<T>(
    url: string,
    fetchFn: () => Promise<T>,
    options?: {
      ttl?: number;
      forceRefresh?: boolean;
    }
  ): Promise<T> {
    const cacheKey = this.generateCacheKey(url, options);
    const ttl = options?.ttl || this.config.defaultTTL;

    // Check if we should force refresh
    if (options?.forceRefresh) {
      this.cache.delete(cacheKey);
      this.pendingRequests.delete(cacheKey);
    }

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // Check if there's already a pending request for this key
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest;
    }

    // Create new request
    const request = fetchFn()
      .then(data => {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl
        });
        this.pendingRequests.delete(cacheKey);
        return data;
      })
      .catch(error => {
        this.pendingRequests.delete(cacheKey);
        throw error;
      });

    this.pendingRequests.set(cacheKey, request);
    return request;
  }

  invalidate(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      this.pendingRequests.clear();
      return;
    }

    const keysToDelete = Array.from(this.cache.keys()).filter(key =>
      key.includes(pattern)
    );
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.pendingRequests.delete(key);
    });
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      maxSize: this.config.maxSize,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Create a singleton instance
export const apiCache = new APICache();

// Convenience functions for common API patterns
export const cachedFetch = async <T>(
  url: string,
  options?: RequestInit & { ttl?: number; forceRefresh?: boolean }
): Promise<T> => {
  const { ttl, forceRefresh, ...fetchOptions } = options || {};
  
  return apiCache.get(
    url,
    async () => {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    { ttl, forceRefresh }
  );
};

export const cachedAsyncStorage = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl = 10 * 60 * 1000 // 10 minutes default
): Promise<T> => {
  return apiCache.get(key, fetchFn, { ttl });
};

export default apiCache;