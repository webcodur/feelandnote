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
      <ArchiveTunnelBanner
        height={350}
        compact
        title="게시판"
        subtitle="Community"
      />
      <PageContainer>
        <BoardTabs />
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </PageContainer>
    </>
  );
}
