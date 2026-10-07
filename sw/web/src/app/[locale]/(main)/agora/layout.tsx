/*
  파일명: /app/(main)/agora/layout.tsx
  기능: 광장 레이아웃
  책임: 광장 공통 탭 네비게이션과 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import type { Metadata } from "next";
import PageContainer from "@/components/layout/PageContainer";
import AgoraTabs from "@/components/features/user/agora/AgoraTabs";
import MessageScope from "@/components/shared/MessageScope";

// 광장 전체 색인 제외 (2026-07-15)
// 게시글 총량이 한 자릿수라 검색엔진에 "제작 중인 사이트" 신호를 보내고,
// 사이트 평균 콘텐츠 품질을 떨어뜨린다. 커뮤니티가 성장하면 이 선언을 제거한다.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

interface Props {
  children: ReactNode;
}

function AgoraLayoutBody({ children }: Props) {
  return (
    <>
      <PageContainer>
        <AgoraTabs />
        {children}
      </PageContainer>
    </>
  );
}

// 이 묶음은 화면마다 쓰는 문구 폭이 넓어 공통 뼈대에 남은 문구를 통째로 덧댄다.
export default function AgoraLayout(props: Props) {
  return (
    <MessageScope>
      <AgoraLayoutBody {...props} />
    </MessageScope>
  );
}
