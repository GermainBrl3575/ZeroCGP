/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["logo.parqet.com", "assets.coingecko.com"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
 
