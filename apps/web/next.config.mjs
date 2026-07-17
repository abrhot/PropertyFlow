import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Silence the "multiple lockfiles" warning by pinning the monorepo root.
  outputFileTracingRoot: path.join(dir, '../../'),
};

export default nextConfig;
