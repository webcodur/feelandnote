import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@feelnnote/api-clients', '@feelnnote/shared'],
  turbopack: {
    root: '../../',
  },
};

export default nextConfig;
