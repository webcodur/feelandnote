/*
  파일명: /app/(standalone)/layout.tsx
  기능: 독립 페이지 그룹 레이아웃
  책임: 사이드바 메뉴에 포함되지 않는 독립 페이지들의 공통 레이아웃을 적용한다.
*/ // ------------------------------

import MainLayout from "@/components/layout/LayoutMain";
import { QuickRecordProvider } from "@/contexts/QuickRecordContext";
import MessageScope from "@/components/shared/MessageScope";

function StandaloneGroupLayoutBody({
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

// 이 묶음은 화면마다 쓰는 문구 폭이 넓어 공통 뼈대에 남은 문구를 통째로 덧댄다.
export default function StandaloneGroupLayout(props: { children: React.ReactNode }) {
  return (
    <MessageScope>
      <StandaloneGroupLayoutBody {...props} />
    </MessageScope>
  );
}
