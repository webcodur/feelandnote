/*
  파일명: /app/(main)/lounge/layout.tsx
  기능: 라운지 레이아웃
  책임: 라운지 공통 탭 네비게이션과 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import PageContainer from "@/components/layout/PageContainer";
import LoungeTabs from "@/components/features/user/lounge/LoungeTabs";
import LyreBanner from "@/components/lab/LyreBanner";

interface Props {
  children: ReactNode;
}

export default function LoungeLayout({ children }: Props) {
  return (
    <>
      <LyreBanner
        height={350}
        compact
        title="라운지"
        subtitle="Lounge"
      />
      <PageContainer>
        <LoungeTabs />
        {children}
      </PageContainer>
    </>
  );
}
