/*
  파일명: /app/(main)/layout.tsx
  기능: 메인 그룹 레이아웃
  책임: 인증된 사용자를 위한 공통 레이아웃을 적용한다.
*/ // ------------------------------

import MainLayout from "@/components/layout/LayoutMain";

import { QuickRecordProvider } from "@/contexts/QuickRecordContext";

export default function MainGroupLayout({
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
