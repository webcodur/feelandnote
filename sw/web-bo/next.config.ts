import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@feelandnote/api-clients', '@feelandnote/shared'],
  turbopack: {
    root: '../../',
  },
};

export default nextConfig;
