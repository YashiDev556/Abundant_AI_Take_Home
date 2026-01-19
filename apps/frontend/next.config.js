const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from root .env.local and .env for runtime
// This ensures DATABASE_URL and other env vars are available in API routes
const rootEnvLocalPath = path.resolve(__dirname, '../../.env.local');
const rootEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: rootEnvLocalPath });
dotenv.config({ path: rootEnvPath });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable production optimizations
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header

  // Disable TypeScript type checking during build
  // (necessary for Turborepo + workspaces + Vercel isolation)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Performance optimizations
  experimental: {
    // Use optimized package imports (tree-shaking for icon libraries)
    // NOTE: Excluding @tanstack/react-query as it causes Turbopack HMR issues
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // Support isolated build directory for build-check script
  // When NEXT_BUILD_DIR is set, use it as the distDir
  ...(process.env.NEXT_BUILD_DIR && {
    distDir: process.env.NEXT_BUILD_DIR,
  }),

  // Turbopack configuration for Next.js 16+
  // Note: Turbopack doesn't support server-relative imports in resolveAlias
  // @repo/db and @repo/types are resolved via npm workspaces automatically
  // Only @repo/server needs an alias since it's not a dependency
  turbopack: {
    resolveAlias: {
      '@repo/server': path.resolve(__dirname, '../server/src'),
    },
    // Ensure workspace packages are resolved correctly, including .mjs for ESM packages
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.mjs'],
  },
  
  // Add headers to prevent caching of JS modules in development
  // This fixes Turbopack HMR issues with stale module factories
  async headers() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/_next/static/chunks/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-store, must-revalidate',
            },
          ],
        },
        {
          source: '/_next/static/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-store, must-revalidate',
            },
          ],
        },
      ]
    }
    return []
  },
  // Webpack fallback for non-Turbopack builds
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@repo/server': path.resolve(__dirname, '../server/src'),
      // @repo/db is resolved via npm workspaces, no alias needed
    }
    // Ensure workspace packages are resolved
    config.resolve.symlinks = true
    // Add .mjs extension for ESM packages like @tanstack/react-query
    config.resolve.extensions = [...(config.resolve.extensions || []), '.mjs']
    
    if (isServer) {
      // Don't bundle Prisma - it needs to be external so engine binaries are available
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals.push('@prisma/client')
      } else {
        config.externals = [config.externals, '@prisma/client']
      }
    }
    
    return config
  },
  // Transpile workspace packages that need to be processed by Next.js
  // NOTE: @tanstack/react-query is already compiled and should NOT be transpiled
  transpilePackages: ['@repo/db', '@repo/types'],
  
  // External packages that should not be bundled
  serverExternalPackages: ['@prisma/client', '@prisma/client/runtime'],
};

module.exports = nextConfig;
