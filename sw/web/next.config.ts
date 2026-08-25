import type { NextConfig } from "next";
import path from "node:path";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  // 개발 서버가 .next를 쓰는 동안에도 빌드 검증을 하려면 NEXT_DIST_DIR로 산출 위치를 분리한다
  distDir: process.env.NEXT_DIST_DIR || '.next',
  env: {
    NEXT_PUBLIC_R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
  },
  webpack(config, { dev }) {
    if (!dev) {
      config.module.rules.unshift({
        test: /\.[jt]sx$/,
        include: path.join(process.cwd(), "src"),
        enforce: "pre",
        use: path.join(process.cwd(), "scripts", "ui-xray-loader.cjs"),
      });
    }

    return config;
  },
  devIndicators: false,
  transpilePackages: ['@feelandnote/api-clients', '@feelandnote/shared'],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'wouqtpvfctednlffross.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'images.igdb.com' },
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
        permanent: true,
      },
      // 목적지 /play 라우트가 존재하지 않아 404로 이어지던 것을 /rest로 교정 (2026-07-14)
      {
        source: '/archive/lounge',
        destination: '/rest',
        permanent: true,
      },
      {
        source: '/archive/feed',
        destination: '/',
        permanent: true,
      },
      // 폐기 경로 → 실제 목적지 영구 리다이렉트 (2026-07-14)
      // page.tsx의 redirect()는 307(임시)라 구글이 정규화 신호로 쓰지 못한다. 308로 영구화
      { source: '/explore/celebs', destination: '/explore/figures', permanent: true },
      { source: '/:locale(ko|en)/explore/celebs', destination: '/:locale/explore/figures', permanent: true },
      { source: '/explore/people', destination: '/agora/social', permanent: true },
      { source: '/:locale(ko|en)/explore/people', destination: '/:locale/agora/social', permanent: true },
      { source: '/explore/figure', destination: '/explore/today', permanent: true },
      { source: '/:locale(ko|en)/explore/figure', destination: '/:locale/explore/today', permanent: true },
      { source: '/explore/celeb-feed', destination: '/explore/feed', permanent: true },
      { source: '/:locale(ko|en)/explore/celeb-feed', destination: '/:locale/explore/feed', permanent: true },
      { source: '/explore/top-by-type', destination: '/explore/ranking', permanent: true },
      { source: '/:locale(ko|en)/explore/top-by-type', destination: '/:locale/explore/ranking', permanent: true },
      { source: '/library/figure', destination: '/explore/today', permanent: true },
      { source: '/:locale(ko|en)/library/figure', destination: '/:locale/explore/today', permanent: true },
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
      // 문의하기 → 서비스 소개 흡수 (2026-08-01)
      { source: '/contact', destination: '/about#contact', permanent: true },
      { source: '/:locale(ko|en)/contact', destination: '/:locale/about#contact', permanent: true },
      // 스포트라이트 → 세력도감(faction) 개명 (2026-07-25)
      {
        source: '/explore/spotlight',
        destination: '/explore/faction',
        permanent: true,
      },
      {
        source: '/explore/spotlight/:path*',
        destination: '/explore/faction/:path*',
        permanent: true,
      },
      {
        source: '/:locale(ko|en)/explore/spotlight',
        destination: '/:locale/explore/faction',
        permanent: true,
      },
      {
        source: '/:locale(ko|en)/explore/spotlight/:path*',
        destination: '/:locale/explore/faction/:path*',
        permanent: true,
      },
      // 시대별·직업별 목록을 「인기 작품」 한 화면으로 합쳤다 (2026-08-02)
      {
        source: '/library/era',
        destination: '/library/popular',
        permanent: true,
      },
      {
        source: '/:locale(ko|en)/library/era',
        destination: '/:locale/library/popular',
        permanent: true,
      },
      {
        source: '/library/profession',
        destination: '/library/popular?view=profession',
        permanent: true,
      },
      {
        source: '/:locale(ko|en)/library/profession',
        destination: '/:locale/library/popular?view=profession',
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
