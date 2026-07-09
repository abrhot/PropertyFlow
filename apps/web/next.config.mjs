/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile the internal workspace packages (they ship TypeScript source).
  transpilePackages: [
    '@fieldtrack/ui',
    '@fieldtrack/types',
    '@fieldtrack/utils',
    '@fieldtrack/constants',
    '@fieldtrack/validation',
  ],
};

export default nextConfig;
