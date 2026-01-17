const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from root .env.local for build time
const rootEnvPath = path.resolve(__dirname, '../../.env.local');
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
};

module.exports = nextConfig;
