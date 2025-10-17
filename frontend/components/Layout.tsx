import React, { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/lib/keycloak';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  showHeader?: boolean;
  showBackButton?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  title = 'Radio Staff Manager',
  description = 'Gestion du personnel radio',
  showHeader = true,
  showBackButton = false,
}) => {
  const { keycloak, authenticated, logout } = useAuth();

  const userName = authenticated && keycloak?.tokenParsed
    ? `${keycloak.tokenParsed.given_name || ''} ${keycloak.tokenParsed.family_name || ''}`.trim() || keycloak.tokenParsed.preferred_username
    : 'Utilisateur';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {showHeader && authenticated && (
          <header className="bg-white shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-4">
                  {showBackButton && (
                    <Link href="/">
                      <button className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                        <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Retour
                      </button>
                    </Link>
                  )}
                  <Link href="/">
                    <h1 className="text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors">
                      Radio Staff Manager
                    </h1>
                  </Link>
                </div>

                <div className="flex items-center space-x-6">
                  <nav className="hidden md:flex space-x-4">
                    <Link
                      href="/planning"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Planning
                    </Link>
                    <Link
                      href="/conges"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Conges
                    </Link>
                  </nav>

                  <div className="flex items-center space-x-4">
                    <div className="hidden md:block text-sm text-gray-700">
                      <span className="font-medium">{userName}</span>
                    </div>
                    <button
                      onClick={logout}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Deconnexion
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>
        )}

        <main>{children}</main>

        {showHeader && authenticated && (
          <footer className="bg-white border-t border-gray-200 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <p className="text-center text-sm text-gray-500">
                Radio Staff Manager - 2025
              </p>
            </div>
          </footer>
        )}
      </div>
    </>
  );
};

export default Layout;
