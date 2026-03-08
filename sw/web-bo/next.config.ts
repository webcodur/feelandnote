import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@feelandnote/api-clients', '@feelandnote/shared'],
  turbopack: {
    root: '../../',
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
