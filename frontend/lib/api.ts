import axios from 'axios';

// Create axios instance
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
});

// Request interceptor to add Keycloak token
api.interceptors.request.use(
  async (config) => {
    // Get Keycloak instance from window (set by AuthProvider)
    if (typeof window !== 'undefined') {
      const keycloak = (window as any).keycloakInstance;

      if (keycloak?.token) {
        // Ensure token is fresh (refresh if needed)
        try {
          await keycloak.updateToken(30);
          config.headers.Authorization = `Bearer ${keycloak.token}`;
        } catch (error) {
          console.error('[API] Token refresh failed:', error);
          // Try login if token refresh fails
          keycloak.login();
        }
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      if (status === 401) {
        // Unauthorized - redirect to login
        console.error('[API] Unauthorized - redirecting to login');
        if (typeof window !== 'undefined') {
          const keycloak = (window as any).keycloakInstance;
          if (keycloak) {
            keycloak.login();
          }
        }
      } else if (status === 403) {
        console.error('[API] Forbidden - insufficient permissions');
      } else if (status === 404) {
        console.error('[API] Resource not found:', message);
      } else if (status >= 500) {
        console.error('[API] Server error:', message);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('[API] Network error - no response from server');
    } else {
      // Error setting up request
      console.error('[API] Request setup error:', error.message);
    }

    return Promise.reject(error);
  }
);