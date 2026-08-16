/*
  파일명: /app/(auth)/layout.tsx
  기능: 인증 페이지 레이아웃
  책임: 로그인/회원가입 페이지의 공통 레이아웃을 제공한다.
*/ // ------------------------------

import type { Metadata } from "next";
import MessageScope from "@/components/shared/MessageScope";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function AuthLayoutBody({
  children
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

// 이 묶음은 화면마다 쓰는 문구 폭이 넓어 공통 뼈대에 남은 문구를 통째로 덧댄다.
export default function AuthLayout(props: { children: React.ReactNode }) {
  return (
    <MessageScope>
      <AuthLayoutBody {...props} />
    </MessageScope>
  );
}
