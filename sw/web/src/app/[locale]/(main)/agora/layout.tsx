/*
  파일명: /app/(main)/agora/layout.tsx
  기능: 광장 레이아웃
  책임: 광장 공통 탭 네비게이션과 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import type { Metadata } from "next";
import PageContainer from "@/components/layout/PageContainer";
import AgoraTabs from "@/components/features/user/agora/AgoraTabs";
import HegemonyMapBanner from "@/components/lab/HegemonyMapBanner";
import PageBanner from "@/components/shared/PageBanner";
import { getTranslations } from "next-intl/server";

// 광장 전체 색인 제외 (2026-07-15)
// 게시글 총량이 한 자릿수라 검색엔진에 "제작 중인 사이트" 신호를 보내고,
// 사이트 평균 콘텐츠 품질을 떨어뜨린다. 커뮤니티가 성장하면 이 선언을 제거한다.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

interface Props {
  children: ReactNode;
}

export default async function AgoraLayout({ children }: Props) {
  const tNav = await getTranslations("nav");
  const tHome = await getTranslations("home");
  const title = tNav("agora");
  const englishTitle = tHome("agora.englishTitle");

  return (
    <>
      <PageBanner title={title} subtitle={englishTitle}>
        <HegemonyMapBanner compact>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight leading-normal text-center">
            {title}
          </h1>
          {title.toLowerCase() !== englishTitle.toLowerCase() && (
            <p className="text-[#d4af37] tracking-[0.3em] sm:tracking-[0.5em] text-xs sm:text-sm mt-3 sm:mt-4 uppercase font-cinzel text-center">
              {englishTitle}
            </p>
          )}
        </HegemonyMapBanner>
      </PageBanner>
      <PageContainer>
        <AgoraTabs />
        {children}
      </PageContainer>
    </>
  );
}
