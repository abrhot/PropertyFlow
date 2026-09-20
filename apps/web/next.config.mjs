import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Silence the "multiple lockfiles" warning by pinning the monorepo root.
  outputFileTracingRoot: path.join(dir, '../../'),
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@tanstack/react-table'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
