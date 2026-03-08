/*
  파일명: /app/(main)/explore/layout.tsx
  기능: 탐색 레이아웃
  책임: 공통 배너(breadcrumb 포함)와 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import PageContainer from "@/components/layout/PageContainer";
import ExploreBanner from "@/components/features/user/explore/hub/ExploreBanner";

interface Props {
  children: ReactNode;
}

export default function ExploreLayout({ children }: Props) {
  return (
    <>
      <ExploreBanner />
      <PageContainer>{children}</PageContainer>
    </>
  );
}
