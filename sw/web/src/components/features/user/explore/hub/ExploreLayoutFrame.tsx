"use client";

import type { ReactNode } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import PageContainer from "@/components/layout/PageContainer";
import ExploreModeTabs from "@/components/shared/ExploreModeTabs";
import ExploreBanner from "./ExploreBanner";

/*
  인물 모드 틀 — 배너(제목·경로) → 인물 | 작품 모드 탭 → 본문.
  하위 화면에서 위로 가는 길은 배너의 경로 줄(탐색 › 세력도감 ›)이 쥔다. 따로 「← 인물」 링크를 두지 않는다.
*/
export default function ExploreLayoutFrame({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();

  // 작품은 자체 배너와 본문 틀을 쓴다. 서버에서 받은 본문은 그대로 통과시킨다.
  if (segment === "works") return children;

  return (
    <>
      <ExploreBanner />
      <PageContainer>
        <ExploreModeTabs />
        {children}
      </PageContainer>
    </>
  );
}
