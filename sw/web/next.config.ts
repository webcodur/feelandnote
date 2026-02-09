import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@feelandnote/api-clients', '@feelandnote/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/archive/explore',
        destination: '/explore',
        permanent: false,
      },
      {
        source: '/archive/lounge',
        destination: '/play',
        permanent: false,
      },
      {
        source: '/archive/feed',
        destination: '/',
        permanent: false,
      },
      // 기본 archive 경로는 일단 두되, 특정 기능에 대한 리다이렉트를 강화
    ];
  },
};

export default nextConfig;
