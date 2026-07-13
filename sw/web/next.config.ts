import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ['@feelandnote/api-clients', '@feelandnote/shared'],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'wouqtpvfctednlffross.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'images.igdb.com' },
      { protocol: 'https', hostname: 'i.scdn.co' },
      { protocol: 'https', hostname: 'shopping-phinf.pstatic.net' },
      { protocol: 'https', hostname: 'books.google.com' },
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
      // /scriptures → /library 경로 변경 (2026-03-26)
      {
        source: '/scriptures',
        destination: '/library',
        permanent: true,
      },
      {
        source: '/scriptures/:path*',
        destination: '/library/:path*',
        permanent: true,
      },
      {
        source: '/:locale(ko|en)/scriptures',
        destination: '/:locale/library',
        permanent: true,
      },
      {
        source: '/:locale(ko|en)/scriptures/:path*',
        destination: '/:locale/library/:path*',
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
