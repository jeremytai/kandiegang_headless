/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hybrid setup: Vite builds the frontend, Next.js handles API routes
  distDir: '.next',

  // Disable static optimization for better API route performance
  productionBrowserSourceMaps: false,

  // Typescript and ESLint already handled by Vite build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
