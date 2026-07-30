/*
  파일명: /app/(main)/library/layout.tsx
  기능: 지혜의 서가 레이아웃
  책임: 공통 배너(breadcrumb 포함)와 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import PageContainer from "@/components/layout/PageContainer";
import LibraryBanner from "@/components/features/library/hub/LibraryBanner";

interface Props {
  children: ReactNode;
}

export default function LibraryLayout({ children }: Props) {
  return (
    <>
      <LibraryBanner />
      <PageContainer>{children}</PageContainer>
    </>
  );
}
