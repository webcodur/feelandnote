/*
  파일명: /app/(main)/explore/layout.tsx
  기능: 탐색 레이아웃
  책임: 공통 탭 네비게이션과 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import PageContainer from "@/components/layout/PageContainer";
import ExploreTabs from "@/components/features/user/explore/ExploreTabs";
import ConstellationBanner from "@/components/lab/ConstellationBanner";
import PageBanner from "@/components/shared/PageBanner";

interface Props {
  children: ReactNode;
}

export default async function ExploreLayout({ children }: Props) {
  const t = await getTranslations();
  const title = t("nav.explore");
  const englishTitle = t("home.explore.englishTitle");

  return (
    <>
      <PageBanner title={title} subtitle={englishTitle}>
        <ConstellationBanner compact>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight leading-normal text-center">
            {title}
          </h1>
          {title.toLowerCase() !== englishTitle.toLowerCase() && (
            <p className="text-[#d4af37] tracking-[0.3em] sm:tracking-[0.5em] text-xs sm:text-sm mt-3 sm:mt-4 uppercase font-cinzel text-center">
              {englishTitle}
            </p>
          )}
        </ConstellationBanner>
      </PageBanner>
      <PageContainer>
        <ExploreTabs />
        {children}
      </PageContainer>
    </>
  );
}


