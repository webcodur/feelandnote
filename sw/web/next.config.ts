import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: '../..',
  },
  transpilePackages: ['@feelnnote/api-clients', '@feelnnote/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'shopping-phinf.pstatic.net' },
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'books.google.com' },
      { protocol: 'https', hostname: 'i.scdn.co' },
      { protocol: 'https', hostname: 'images.igdb.com' },
      { protocol: 'https', hostname: 'encrypted-tbn0.gstatic.net' },
      { protocol: 'https', hostname: 'encrypted-tbn0.gstatic.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'pds.joongang.co.kr' },
      { protocol: 'https', hostname: '*.joongang.co.kr' },
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
