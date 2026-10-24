"use client";

import type { ReactNode } from "react";

/** 라벨 자체가 출처 링크다. 전문을 여는 부모의 클릭·키보드 동작과 겹치지 않는다. */
export default function ContentSourceLabel({ href, children }: { href?: string | null; children: ReactNode }) {
  if (!href) return <>{children}</>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-sm underline decoration-current underline-offset-4 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  );
}
