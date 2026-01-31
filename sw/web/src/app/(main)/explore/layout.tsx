/*
  파일명: /app/(main)/explore/layout.tsx
  기능: 탐색 레이아웃
  책임: 공통 탭 네비게이션과 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import PageContainer from "@/components/layout/PageContainer";
import { PageHeroSection } from "@/components/ui";
import ExploreTabs from "@/components/features/user/explore/ExploreTabs";

interface Props {
  children: ReactNode;
}

export default function ExploreLayout({ children }: Props) {
  return (
    <PageContainer>
      <PageHeroSection
        englishTitle="Inspiring People"
        title="영감을 나누는 사람들"
        description="다양한 콘텐츠 기록을 탐색하세요"
      />
      <ExploreTabs />
      {children}
    </PageContainer>
  );
}
