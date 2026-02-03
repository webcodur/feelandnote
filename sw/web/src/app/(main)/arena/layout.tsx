/*
  파일명: /app/(main)/arena/layout.tsx
  기능: 전장 레이아웃
  책임: 전장 공통 탭 네비게이션과 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import PageContainer from "@/components/layout/PageContainer";
import ArenaTabs from "@/components/features/game/ArenaTabs";
import HexagonBanner from "@/components/lab/HexagonBanner";
import { PAGE_BANNER } from "@/constants/navigation";

interface Props {
  children: ReactNode;
}

export default function ArenaLayout({ children }: Props) {
  const { title, englishTitle } = PAGE_BANNER.arena;

  return (
    <>
      <HexagonBanner compact>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight leading-normal text-center">
          {title}
        </h1>
        <p className="text-[#d4af37] tracking-[0.3em] sm:tracking-[0.5em] text-xs sm:text-sm mt-3 sm:mt-4 uppercase font-cinzel text-center">
          {englishTitle}
        </p>
      </HexagonBanner>
      <PageContainer>
        <ArenaTabs />
        {children}
      </PageContainer>
    </>
  );
}
