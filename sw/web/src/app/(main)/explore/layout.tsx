/*
  파일명: /app/(main)/explore/layout.tsx
  기능: 탐색 레이아웃
  책임: 공통 탭 네비게이션과 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import PageContainer from "@/components/layout/PageContainer";
import ExploreTabs from "@/components/features/user/explore/ExploreTabs";
import ConstellationBanner from "@/components/lab/ConstellationBanner";

interface Props {
  children: ReactNode;
}

export default function ExploreLayout({ children }: Props) {
  return (
    <>
      <ConstellationBanner
        height={350}
        compact
        title="탐색"
        subtitle="Explore"
      />
      <PageContainer>
        <ExploreTabs />
        {children}
      </PageContainer>
    </>
  );
}
