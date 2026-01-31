/*
  파일명: /app/(main)/board/layout.tsx
  기능: 게시판 레이아웃
  책임: 공통 탭 네비게이션과 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import PageContainer from "@/components/layout/PageContainer";
import { PageHeroSection } from "@/components/ui";
import BoardTabs from "@/components/features/board/shared/BoardTabs";

interface Props {
  children: ReactNode;
}

export default function BoardLayout({ children }: Props) {
  return (
    <PageContainer>
      <PageHeroSection
        englishTitle="Community"
        title="게시판"
        description="공지사항을 확인하고 피드백을 남겨주세요"
      />
      <BoardTabs />
      <div className="max-w-3xl mx-auto">
        {children}
      </div>
    </PageContainer>
  );
}
