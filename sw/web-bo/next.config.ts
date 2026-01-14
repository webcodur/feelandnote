import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ['@feelnnote/api-clients'],
  ...(process.env.NODE_ENV === 'development' && {
    turbopack: {
      root: path.resolve(__dirname, '../..')
    }
  }),
};

export default nextConfig;
