/*
  파일명: /app/(main)/lounge/layout.tsx
  기능: 라운지 레이아웃
  책임: 라운지 공통 탭 네비게이션과 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import PageContainer from "@/components/layout/PageContainer";
import { PageHeroSection } from "@/components/ui";
import LoungeTabs from "@/components/features/user/lounge/LoungeTabs";

interface Props {
  children: ReactNode;
}

export default function LoungeLayout({ children }: Props) {
  return (
    <PageContainer>
      <PageHeroSection
        englishTitle="Lounge"
        title="라운지"
        description="휴식 속에서 즐거움을 더해보세요."
      />
      <LoungeTabs />
      {children}
    </PageContainer>
  );
}
