import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 서버가 .next를 쓰는 동안에도 빌드 검증을 하려면 NEXT_DIST_DIR로 산출 위치를 분리한다
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // 카드뉴스 미리보기가 렌더 저장소의 화면 부품(BookCard)을 그대로 띄운다 —
  // 그 패키지는 빌드 산출물이 아니라 소스(.tsx)를 내보내므로 트랜스파일 대상에 넣는다.
  transpilePackages: ['@feelandnote/api-clients', '@feelandnote/shared', '@feelandnote/remotion'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
