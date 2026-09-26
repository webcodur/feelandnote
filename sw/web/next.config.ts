import type { NextConfig } from "next";
import path from "node:path";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  deploymentId: process.env.NEXT_DEPLOYMENT_ID,
  // Windows 빌드에서도 Oracle Linux용 sharp 네이티브 파일을 standalone에 넣는다.
  // pnpm-workspace.yaml의 supportedArchitectures가 설치를, 이 trace가 복사를 맡는다.
  outputFileTracingIncludes: {
    '/*': [
      './node_modules/@img/sharp-linux-x64/**/*',
      './node_modules/@img/sharp-libvips-linux-x64/**/*',
    ],
  },
  // 개발 서버가 .next를 쓰는 동안에도 빌드 검증을 하려면 NEXT_DIST_DIR로 산출 위치를 분리한다
  distDir: process.env.NEXT_DIST_DIR || '.next',
  env: {
    NEXT_PUBLIC_R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    // 배포마다 달라지는 값. 브라우저에 박아 두고 서버가 내주는 값과 비교해,
    // 배포 순간 열려 있던 탭이 낡은 번들을 쥔 채라는 것을 화면에서 알린다.
    NEXT_PUBLIC_DEPLOYMENT_ID: process.env.NEXT_DEPLOYMENT_ID ?? '',
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
      { source: '/explore/figures', destination: '/explore', permanent: true },
      { source: '/:locale(ko|en)/explore/figures', destination: '/:locale/explore', permanent: true },
      { source: '/explore/celebs', destination: '/explore', permanent: true },
      { source: '/:locale(ko|en)/explore/celebs', destination: '/:locale/explore', permanent: true },
      { source: '/explore/people', destination: '/agora/social', permanent: true },
      { source: '/:locale(ko|en)/explore/people', destination: '/:locale/agora/social', permanent: true },
      { source: '/explore/figure', destination: '/explore/today', permanent: true },
      { source: '/:locale(ko|en)/explore/figure', destination: '/:locale/explore/today', permanent: true },
      { source: '/explore/celeb-feed', destination: '/explore/feed', permanent: true },
      { source: '/:locale(ko|en)/explore/celeb-feed', destination: '/:locale/explore/feed', permanent: true },
      { source: '/explore/top-by-type', destination: '/explore/ranking', permanent: true },
      { source: '/:locale(ko|en)/explore/top-by-type', destination: '/:locale/explore/ranking', permanent: true },
      { source: '/explore/persona', destination: '/explore/spectrum', permanent: true },
      { source: '/ko/explore/persona', destination: '/explore/spectrum', permanent: true },
      { source: '/en/explore/persona', destination: '/en/explore/spectrum', permanent: true },
      // 영상관은 서재 탐방 형태를 바꾸는 동안 내려 둔다(26.09.16) — 되살리면 이 두 줄을 지운다
      { source: '/explore/youtube', destination: '/explore', permanent: false },
      { source: '/:locale(ko|en)/explore/youtube', destination: '/:locale/explore', permanent: false },
      // 두 세대의 옛 작품 주소를 정본으로 바로 보낸다. 특정 경로가 catch-all보다 먼저다.
      ...['library', 'scriptures'].flatMap((legacy) =>
        ['', '/ko', '/en'].flatMap((prefix) => {
          const destinationPrefix = prefix === '/ko' ? '' : prefix;
          return [
            ['figure', '/explore/today'],
            ['era', '/explore/works/popular'],
            ['profession', '/explore/works/popular?view=profession'],
            ['', '/explore/works'],
            [':path*', '/explore/works/:path*'],
          ].map(([suffix, destination]) => ({
            source: `${prefix}/${legacy}${suffix ? `/${suffix}` : ''}`,
            destination: `${destinationPrefix}${destination}`,
            permanent: true,
          }));
        }),
      ),
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
    ];
  },
};

export default withNextIntl(nextConfig);
