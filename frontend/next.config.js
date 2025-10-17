/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Output standalone for Docker
  output: 'standalone',

  // Optimize images
  images: {
    domains: ['192.168.1.200', 'localhost'],
    formats: ['image/avif', 'image/webp'],
  },

  // Environment variables validation
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_KEYCLOAK_URL: process.env.NEXT_PUBLIC_KEYCLOAK_URL,
    NEXT_PUBLIC_KEYCLOAK_REALM: process.env.NEXT_PUBLIC_KEYCLOAK_REALM,
    NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Fix for modules that need to run only on client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // Production optimizations
  productionBrowserSourceMaps: false,
  compress: true,

  // Performance optimizations
  poweredByHeader: false,
  generateEtags: true,

  // Typescript and ESLint
  typescript: {
    // Don't fail build on type errors in production (just warn)
    ignoreBuildErrors: false,
  },

  // Experimental features
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['@fullcalendar/react'],
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;