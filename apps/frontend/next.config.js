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

  // Disable TypeScript type checking during build
  // (necessary for Turborepo + workspaces + Vercel isolation)
  typescript: {
    ignoreBuildErrors: true,
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
    // Ensure workspace packages are resolved correctly
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
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
  transpilePackages: ['@repo/db', '@repo/types'],
  
  // External packages that should not be bundled
  serverExternalPackages: ['@prisma/client', '@prisma/client/runtime'],
};

module.exports = nextConfig;
