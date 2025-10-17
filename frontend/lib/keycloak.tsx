import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Keycloak from 'keycloak-js';

// Keycloak configuration from environment variables
const keycloakConfig = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://192.168.1.200/auth',
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'radio-staff',
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'radio-frontend',
};

// Validate configuration
if (typeof window !== 'undefined') {
  console.log('[Keycloak] Configuration:', {
    url: keycloakConfig.url,
    realm: keycloakConfig.realm,
    clientId: keycloakConfig.clientId,
  });
}

// Initialize Keycloak instance
let keycloakInstance: Keycloak | null = null;

export const getKeycloak = (): Keycloak => {
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak(keycloakConfig);

    // Store in window for API interceptor
    if (typeof window !== 'undefined') {
      (window as any).keycloakInstance = keycloakInstance;
    }
  }
  return keycloakInstance;
};

// Auth Context Type
interface AuthContextType {
  keycloak: Keycloak | null;
  initialized: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
  updateToken: (minValidity?: number) => Promise<boolean>;
}

// Create Auth Context
const AuthContext = createContext<AuthContextType>({
  keycloak: null,
  initialized: false,
  authenticated: false,
  login: () => {},
  logout: () => {},
  hasRole: () => false,
  updateToken: async () => false,
});

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const initKeycloak = async () => {
      try {
        const kc = getKeycloak();

        // Initialize Keycloak
        const auth = await kc.init({
          onLoad: 'login-required',
          pkceMethod: 'S256',
          checkLoginIframe: false,
          checkLoginIframeInterval: 0,
          enableLogging: true,
        });

        console.log('[Keycloak] Initialized successfully');
        console.log('[Keycloak] Authenticated:', auth);

        setKeycloak(kc);
        setAuthenticated(auth);
        setInitialized(true);

        // Set up token refresh
        if (auth) {
          // Refresh token every 60 seconds
          setInterval(() => {
            kc.updateToken(70)
              .then((refreshed) => {
                if (refreshed) {
                  console.log('[Keycloak] Token refreshed');
                }
              })
              .catch(() => {
                console.error('[Keycloak] Failed to refresh token');
              });
          }, 60000);
        }

        // Event listeners
        kc.onTokenExpired = () => {
          console.log('[Keycloak] Token expired');
          kc.updateToken(30)
            .then((refreshed) => {
              if (refreshed) {
                console.log('[Keycloak] Token refreshed on expiration');
              } else {
                console.log('[Keycloak] Token not refreshed, still valid');
              }
            })
            .catch(() => {
              console.error('[Keycloak] Failed to refresh expired token');
              kc.login();
            });
        };

        kc.onAuthSuccess = () => {
          console.log('[Keycloak] Authentication successful');
          setAuthenticated(true);
        };

        kc.onAuthError = () => {
          console.error('[Keycloak] Authentication error');
          setAuthenticated(false);
        };

        kc.onAuthRefreshSuccess = () => {
          console.log('[Keycloak] Token refresh successful');
        };

        kc.onAuthRefreshError = () => {
          console.error('[Keycloak] Token refresh error');
          kc.login();
        };

        kc.onAuthLogout = () => {
          console.log('[Keycloak] User logged out');
          setAuthenticated(false);
        };

      } catch (error) {
        console.error('[Keycloak] Initialization error:', error);
        setInitialized(true);
      }
    };

    // Only initialize on client side
    if (typeof window !== 'undefined') {
      initKeycloak();
    }
  }, []);

  const login = () => {
    if (keycloak) {
      keycloak.login();
    }
  };

  const logout = () => {
    if (keycloak) {
      keycloak.logout({
        redirectUri: typeof window !== 'undefined' ? window.location.origin : undefined,
      });
    }
  };

  const hasRole = (role: string): boolean => {
    if (!keycloak || !keycloak.realmAccess) {
      return false;
    }
    return keycloak.realmAccess.roles.includes(role);
  };

  const updateToken = async (minValidity: number = 30): Promise<boolean> => {
    if (!keycloak) {
      return false;
    }
    try {
      return await keycloak.updateToken(minValidity);
    } catch (error) {
      console.error('[Keycloak] Token update error:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    keycloak,
    initialized,
    authenticated,
    login,
    logout,
    hasRole,
    updateToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protected routes
export const withAuth = (Component: React.ComponentType<any>) => {
  return (props: any) => {
    const { keycloak, initialized, authenticated } = useAuth();

    useEffect(() => {
      if (initialized && !authenticated) {
        keycloak?.login();
      }
    }, [initialized, authenticated, keycloak]);

    if (!initialized) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Initialisation...</p>
          </div>
        </div>
      );
    }

    if (!authenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Redirection vers la connexion...</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

export default keycloakInstance;
