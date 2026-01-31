/*
  파일명: /app/(main)/scriptures/layout.tsx
  기능: 지혜의 서고 레이아웃
  책임: 공통 탭 네비게이션과 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import PageContainer from "@/components/layout/PageContainer";
import ScripturesTabs from "@/components/features/scriptures/ScripturesTabs";
import TreeBanner from "@/components/lab/TreeBanner";

interface Props {
  children: ReactNode;
}

export default function ScripturesLayout({ children }: Props) {
  return (
    <>
      <TreeBanner
        height={350}
        compact
        title="지혜의 서고"
        subtitle="Sacred Archives"
      />
      <PageContainer>
        <ScripturesTabs />
        {children}
      </PageContainer>
    </>
  );
}
