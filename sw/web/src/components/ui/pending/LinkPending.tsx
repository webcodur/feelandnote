/*
  파일명: /components/ui/pending/LinkPending.tsx
  기능: 눌러 놓은 링크가 다음 화면을 불러오는 동안 표식을 보여준다
  책임: 기다리는 동안은 마름모 하나가 밝기만 오가는 최소 표식을 그리고,
        아니면 children(그 자리의 기본 아이콘)을 그대로 그린다.
        반드시 <Link>의 자식으로 둔다 — Link 밖에서는 항상 대기 중이 아닌 상태로 읽힌다.
*/ // ------------------------------

"use client";

import type { ReactNode } from "react";
import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  children?: ReactNode;
  className?: string;
}

export default function LinkPending({ children, className }: Props) {
  const { pending } = useLinkStatus();

  if (!pending) return <>{children}</>;

  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-1.5 w-1.5 shrink-0 rotate-45 border border-accent animate-pending-mark motion-reduce:animate-none",
        className,
      )}
    />
  );
}
