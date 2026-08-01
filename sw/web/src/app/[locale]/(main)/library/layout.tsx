/*
  파일명: /app/(main)/library/layout.tsx
  기능: 지혜의 서가 레이아웃
  책임: 공통 배너(breadcrumb 포함)와 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import PageContainer from "@/components/layout/PageContainer";
import LibraryBanner from "@/components/features/library/hub/LibraryBanner";
import { LibraryCrumbProvider } from "@/components/features/library/hub/LibraryCrumbs";

interface Props {
  children: ReactNode;
}

export default function LibraryLayout({ children }: Props) {
  return (
    // 기관·목록처럼 이름이 자료에 있는 화면이 배너에 자기 이름을 알릴 수 있게 감싼다
    <LibraryCrumbProvider>
      <LibraryBanner />
      <PageContainer>{children}</PageContainer>
    </LibraryCrumbProvider>
  );
}
