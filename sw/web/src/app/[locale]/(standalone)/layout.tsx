/*
  파일명: /app/(standalone)/layout.tsx
  기능: 독립 페이지 그룹 레이아웃
  책임: 사이드바 메뉴에 포함되지 않는 독립 페이지들의 공통 레이아웃을 적용한다.
*/ // ------------------------------

import MainLayout from "@/components/layout/LayoutMain";
import { QuickRecordProvider } from "@/contexts/QuickRecordContext";

export default function StandaloneGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QuickRecordProvider>
      <MainLayout>{children}</MainLayout>
    </QuickRecordProvider>
  );
}
