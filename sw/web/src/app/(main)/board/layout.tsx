/*
  파일명: /app/(main)/board/layout.tsx
  기능: 게시판 레이아웃
  책임: 공통 탭 네비게이션과 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import PageContainer from "@/components/layout/PageContainer";
import BoardTabs from "@/components/features/board/shared/BoardTabs";
import ArchiveTunnelBanner from "@/components/lab/ArchiveTunnelBanner";

interface Props {
  children: ReactNode;
}

export default function BoardLayout({ children }: Props) {
  return (
    <>
      <ArchiveTunnelBanner height={350} compact>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight leading-normal text-center">
          게시판
        </h1>
        <p className="text-[#d4af37] tracking-[0.3em] sm:tracking-[0.5em] text-xs sm:text-sm mt-3 sm:mt-4 uppercase font-cinzel text-center">
          Board
        </p>
      </ArchiveTunnelBanner>
      <PageContainer>
        <BoardTabs />
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </PageContainer>
    </>
  );
}
