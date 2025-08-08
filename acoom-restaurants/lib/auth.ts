import { useEffect, useState } from "react";
import { useRouter, useSegments } from "expo-router";
import { SecureApiService } from "./SecureApiService";
import React from "react";

export function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await SecureApiService.isAuthenticated();
      setIsAuthenticated(authenticated);

      const currentPath = segments.join("/");
      const isPublicRoute =
        currentPath === "login" ||
        currentPath === "signup" ||
        currentPath === "";

      if (!authenticated && !isPublicRoute) {
        // Redirect to login if not authenticated and trying to access protected route
        router.replace("/login");
      } else if (authenticated && isPublicRoute) {
        // Redirect to dashboard if authenticated and on public route
        router.replace("/dashboard");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
      router.replace("/login");
    } finally {
      setIsLoading(false);
    }
  };

  return { isAuthenticated, isLoading, checkAuthStatus };
}

export function withAuth<T extends object>(Component: React.ComponentType<T>) {
  return function AuthenticatedComponent(props: T) {
    const { isAuthenticated, isLoading } = useProtectedRoute();

    if (isLoading) {
      return null; // or a loading spinner
    }

    if (!isAuthenticated) {
      return null; // This will trigger the redirect in useProtectedRoute
    }

    return React.createElement(Component, props);
  };
}
