/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth", "xlsx"],
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
