import axios from 'axios';

// Helper function to get CSRF token from cookie
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;

  const name = 'XSRF-TOKEN=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookies = decodedCookie.split(';');

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i].trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length);
    }
  }
  return null;
}

// Create axios instance with credentials enabled for CSRF cookies
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  withCredentials: true, // Enable sending cookies with requests
});

// Request interceptor to add JWT token and CSRF token
api.interceptors.request.use(
  (config) => {
    // Add JWT token from localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add CSRF token for state-changing requests
      const method = config.method?.toUpperCase();
      if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
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
      const url = error.config?.url || '';

      // Don't redirect on 401 during login attempts (allow fallback to SuperAdmin login)
      const isLoginAttempt = url.includes('/auth/login') || url.includes('/auth/super-admin/login');

      if (status === 401 && !isLoginAttempt) {
        // Unauthorized - clear token and redirect to login
        console.error('[API] Unauthorized - redirecting to login');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      } else if (status === 401 && isLoginAttempt) {
        // Login failed - let the login function handle it (for Employee -> SuperAdmin fallback)
        console.error('[API] Login attempt failed - will try alternate login method');
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