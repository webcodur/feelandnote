/*
  파일명: /app/(main)/explore/layout.tsx
  기능: 탐색 레이아웃
  책임: 공통 탭 네비게이션과 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import PageContainer from "@/components/layout/PageContainer";
import ExploreTabs from "@/components/features/user/explore/ExploreTabs";
import ConstellationBanner from "@/components/lab/ConstellationBanner";
import { PAGE_BANNER } from "@/constants/navigation";

interface Props {
  children: ReactNode;
}

export default function ExploreLayout({ children }: Props) {
  const { title, englishTitle } = PAGE_BANNER.explore;

  return (
    <>
      <ConstellationBanner compact>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight leading-normal text-center">
          {title}
        </h1>
        <p className="text-[#d4af37] tracking-[0.3em] sm:tracking-[0.5em] text-xs sm:text-sm mt-3 sm:mt-4 uppercase font-cinzel text-center">
          {englishTitle}
        </p>
      </ConstellationBanner>
      <PageContainer>
        <ExploreTabs />
        {children}
      </PageContainer>
    </>
  );
}
