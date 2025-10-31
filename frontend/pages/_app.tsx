import { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '@/lib/auth';
import ErrorBoundary from '@/components/ErrorBoundary';
import Navigation from '@/components/Navigation';
import '@/styles/globals.css';

function AppContent({ Component, pageProps }: { Component: AppProps['Component']; pageProps: any }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const isLoginPage = router.pathname === '/login';

  console.log('[_app] AppContent - loading:', loading, 'user:', user, 'isLoginPage:', isLoginPage, 'pathname:', router.pathname);

  useEffect(() => {
    console.log('[_app] useEffect - loading:', loading, 'user:', user, 'isLoginPage:', isLoginPage);
    if (!loading && !user && !isLoginPage) {
      console.log('[_app] Redirecting to /login');
      router.replace('/login');
    }
  }, [user, loading, isLoginPage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user && !isLoginPage) {
    return null;
  }

  return isLoginPage ? (
    <Component {...pageProps} />
  ) : (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-8">
          <Component {...pageProps} />
        </div>
      </main>
    </div>
  );
}

function MyApp({ Component, pageProps }: AppProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Prevent hydration mismatch by only rendering after client mount
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent Component={Component} pageProps={pageProps} />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default MyApp;
