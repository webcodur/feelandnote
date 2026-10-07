/*
  파일명: /components/ui/pending/LinkPending.tsx
  기능: 눌러 놓은 링크가 다음 화면을 불러오는 동안 표식을 보여준다
  책임: 기다리는 동안 작은 점으로 진행 중임을 알리고,
        아니면 children(그 자리의 기본 아이콘)을 그대로 그린다.
        반드시 <Link>의 자식으로 둔다 — Link 밖에서는 항상 대기 중이 아닌 상태로 읽힌다.
*/ // ------------------------------

"use client";

import type { ReactNode } from "react";
import { useLinkStatus } from "next/link";
import PendingMark from "./PendingMark";

interface Props {
  children?: ReactNode;
  className?: string;
}

export default function LinkPending({ children, className }: Props) {
  const { pending } = useLinkStatus();

  if (!pending) return <>{children}</>;

  return <PendingMark size="sm" className={className} />;
}
