/*
  파일명: /app/reading/layout.tsx
  기능: 독서 모드 레이아웃
  책임: 헤더/사이드바 없는 풀스크린 몰입 환경 제공
*/ // ------------------------------

import type { Metadata } from "next";
import MessageScope from "@/components/shared/MessageScope";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function ReadingLayoutBody({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-main text-text-primary">
      {children}
    </div>
  );
}

// 이 묶음은 화면마다 쓰는 문구 폭이 넓어 공통 뼈대에 남은 문구를 통째로 덧댄다.
export default function ReadingLayout(props: { children: React.ReactNode }) {
  return (
    <MessageScope>
      <ReadingLayoutBody {...props} />
    </MessageScope>
  );
}
