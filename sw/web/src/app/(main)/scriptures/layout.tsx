/*
  파일명: /app/(main)/scriptures/layout.tsx
  기능: 지혜의 서고 레이아웃
  책임: 공통 탭 네비게이션과 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import PageContainer from "@/components/layout/PageContainer";
import { PageHeroSection } from "@/components/ui";
import ScripturesTabs from "@/components/features/scriptures/ScripturesTabs";

interface Props {
  children: ReactNode;
}

export default function ScripturesLayout({ children }: Props) {
  return (
    <PageContainer>
      <PageHeroSection
        englishTitle="Sacred Archives"
        title="지혜의 서고"
        description="시대를 관통한 지혜가 잠든 곳. 인물들이 남긴 경전을 탐색하세요."
      />
      <ScripturesTabs />
      {children}
    </PageContainer>
  );
}
