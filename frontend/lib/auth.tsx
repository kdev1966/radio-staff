import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { api } from './api';

interface User {
  id: string;
  email: string;
  isSuperAdmin?: boolean;
  // Employee fields (when isSuperAdmin is false/undefined)
  firstName?: string;
  lastName?: string;
  role?: string;
  matricule?: string;
  serviceId?: string;
  permissions?: string[];
  employeeType?: string;
  // SuperAdmin fields (when isSuperAdmin is true)
  fullName?: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // First try to load user from localStorage (faster and avoids JWT issues)
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          console.log('Loaded user from localStorage:', parsedUser);
          setUser(parsedUser);
          setLoading(false);
          return;
        } catch (e) {
          console.error('Failed to parse stored user:', e);
        }
      }

      // Fallback: try to fetch user profile (may fail for SuperAdmin due to JWT issues)
      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (apiError) {
        console.error('Auth API check failed:', apiError);
        // If API fails but we have a token, clear everything and force re-login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Try employee login first
      let response = await api.post('/auth/login', { email, password }).catch(async (employeeError) => {
        // If employee login fails, try SuperAdmin login
        console.log('Employee login failed, trying SuperAdmin login...');
        try {
          const superAdminResponse = await api.post('/auth/super-admin/login', { email, password });
          console.log('SuperAdmin login successful');
          return superAdminResponse;
        } catch (superAdminError) {
          // If both fail, throw the original employee error
          throw employeeError;
        }
      });

      const { access_token, user: userData } = response.data;
      console.log('Login successful, user:', userData);

      // Store both token and user data in localStorage
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      // Use router.replace instead of push to avoid back button issues
      // Small delay to ensure state is updated
      setTimeout(() => {
        router.replace('/');
      }, 100);
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// HOC for protected routes
export const withAuth = (Component: React.ComponentType<any>) => {
  return (props: any) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.push('/login');
      }
    }, [loading, user, router]);

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Redirection...</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};
