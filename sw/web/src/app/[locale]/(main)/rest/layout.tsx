/*
  파일명: /app/(main)/rest/layout.tsx
  기능: 쉼터 레이아웃
  책임: 쉼터 공통 탭 네비게이션과 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import PageContainer from "@/components/layout/PageContainer";
import ArenaTabs from "@/components/features/game/ArenaTabs";
import HexagonBanner from "@/components/lab/HexagonBanner";
import PageBanner from "@/components/shared/PageBanner";
import { getTranslations } from "next-intl/server";

interface Props {
  children: ReactNode;
}

export default async function RestLayout({ children }: Props) {
  const tNav = await getTranslations("nav");
  const tHome = await getTranslations("home");
  const title = tNav("rest");
  const englishTitle = tHome("rest.englishTitle");

  return (
    <>
      <PageBanner title={title} subtitle={englishTitle}>
        <HexagonBanner compact>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight leading-normal text-center">
            {title}
          </h1>
          {title.toLowerCase() !== englishTitle.toLowerCase() && (
            <p className="text-[#d4af37] tracking-[0.3em] sm:tracking-[0.5em] text-xs sm:text-sm mt-3 sm:mt-4 uppercase font-cinzel text-center">
              {englishTitle}
            </p>
          )}
        </HexagonBanner>
      </PageBanner>
      <PageContainer>
        <ArenaTabs />
        {children}
      </PageContainer>
    </>
  );
}
