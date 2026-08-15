/*
  파일명: /components/ui/pending/Deferred.tsx
  기능: 화면 근처까지 스크롤이 올 때까지 자리만 지킨다
  책임: 첫 화면 밖 + 색인 가치 없음 + 비싼 조회, 이 셋을 모두 만족하는 구획에만 쓴다.
        색인 대상 본문은 서버 HTML에 그대로 둔다.
*/ // ------------------------------

"use client";

import type { ReactNode } from "react";
import { useNearViewport } from "./useNearViewport";

interface Props {
  fallback: ReactNode;
  children: ReactNode;
  rootMargin?: string;
  className?: string;
}

export default function Deferred({
  fallback,
  children,
  rootMargin = "600px 0px",
  className,
}: Props) {
  const { ref, isNear } = useNearViewport(rootMargin);

  return (
    <div ref={ref} className={className}>
      {isNear ? children : fallback}
    </div>
  );
}
