import { useCallback, useRef } from "react";

interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
}

/**
 * Enhanced debounce hook with cancel and flush capabilities
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): DebouncedFunction<T> {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const argsRef = useRef<Parameters<T> | undefined>(undefined);

  const debouncedFunction = useCallback(
    (...args: Parameters<T>) => {
      argsRef.current = args;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
        timeoutRef.current = null;
      }, delay);
    },
    [callback, delay]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current && argsRef.current) {
      clearTimeout(timeoutRef.current);
      callback(...argsRef.current);
      timeoutRef.current = null;
    }
  }, [callback]);

  return Object.assign(debouncedFunction, { cancel, flush });
}

/**
 * Throttle hook to limit function execution frequency
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastCall);
      }
    },
    [callback, delay]
  ) as T;
}

/**
 * Input validation hook
 */
export function useInputValidation() {
  const validateMessage = useCallback(
    (
      text: string
    ): {
      isValid: boolean;
      error?: string;
    } => {
      if (!text.trim()) {
        return { isValid: false, error: "Mesajul nu poate fi gol" };
      }

      if (text.length > 1000) {
        return {
          isValid: false,
          error: "Mesajul este prea lung (max 1000 caractere)",
        };
      }

      // Check for spam patterns
      const spamPatterns = [
        /(.)\1{10,}/, // Repeated characters
        /^[A-Z\s!]{20,}$/, // All caps
      ];

      for (const pattern of spamPatterns) {
        if (pattern.test(text)) {
          return { isValid: false, error: "Mesajul pare a fi spam" };
        }
      }

      return { isValid: true };
    },
    []
  );

  return { validateMessage };
}

export default {
  useDebounce,
  useThrottle,
  useInputValidation,
};
