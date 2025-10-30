import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { api } from './api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  matricule: string;
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

      // Verify token is valid by fetching user profile
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user: userData } = response.data;

      localStorage.setItem('token', access_token);
      setUser(userData);

      router.push('/');
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
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
