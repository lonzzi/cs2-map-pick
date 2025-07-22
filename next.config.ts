import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/ghostcap-gaming/cs2-map-images/**',
      },
      {
        protocol: 'https',
        hostname: 'ghfast.top',
      },
    ],
  },
};

export default nextConfig;
