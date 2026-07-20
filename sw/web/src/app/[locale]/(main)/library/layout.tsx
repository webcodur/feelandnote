/*
  파일명: /app/(main)/library/layout.tsx
  기능: 지혜의 서가 레이아웃
  책임: 공통 배너(breadcrumb 포함)와 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import PageContainer from "@/components/layout/PageContainer";
import ScripturesBanner from "@/components/features/scriptures/hub/ScripturesBanner";

interface Props {
  children: ReactNode;
}

export default function ScripturesLayout({ children }: Props) {
  return (
    <>
      <ScripturesBanner />
      <PageContainer>{children}</PageContainer>
    </>
  );
}
