import { useState } from "react";

interface MenuPreloadStatus {
  isPreloading: boolean;
  locationsTotal: number;
  locationsProcessed: number;
  lastRefresh: Date | null;
  errors: string[];
}

interface UseMenuPreloaderConfig {
  refreshIntervalMinutes?: number;
  enableBackgroundRefresh?: boolean;
  retryFailedParsing?: boolean;
}

export const useMenuPreloader = (config: UseMenuPreloaderConfig = {}) => {
  // Simplified status - no actual preloading, just indicates AI is ready
  const [status, setStatus] = useState<MenuPreloadStatus>({
    isPreloading: false,
    locationsTotal: 1,
    locationsProcessed: 1,
    lastRefresh: new Date(),
    errors: [],
  });

  // Simplified preload function that just marks as complete
  const preloadAllMenus = async (): Promise<void> => {
    console.log("AI Service is ready - no preloading required");
    return Promise.resolve();
  };

  // Simplified refresh function
  const refreshMenuCache = async (): Promise<void> => {
    console.log("AI Service cache refreshed");
    setStatus((prev) => ({
      ...prev,
      lastRefresh: new Date(),
    }));
    return Promise.resolve();
  };

  return {
    status,
    preloadAllMenus,
    refreshMenuCache,
  };
};

export default useMenuPreloader;
