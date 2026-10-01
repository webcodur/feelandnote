/*
  파일명: components/features/game/myth/shared/StagePoster.tsx
  기능: 신화 게임 표지 그림 틀
  책임: 신화 타이틀 그림을 금테·안쪽 선·네 모서리 장식을 두른 액자로 세운다. 시작·결과 화면이 함께 쓴다.
        그림 위에 올릴 글(children)은 아래쪽 어둠 위에 놓인다.
*/ // ------------------------------
"use client";

import type { ReactNode } from "react";
import { artAt, artSrcSet } from "./art";

const CORNER = "pointer-events-none absolute h-5 w-5 border-accent";

interface Props {
  src: string | null;
  className?: string;
  // 그림이 차지하는 폭(브라우저가 알맞은 판을 고른다)
  sizes?: string;
  children?: ReactNode;
}

export default function StagePoster({ src, className = "", sizes = "(min-width: 1024px) 50vw, 100vw", children }: Props) {
  if (!src) return null;
  return (
    <figure className={`relative isolate overflow-hidden rounded-2xl border border-accent-dim bg-bg-card shadow-[0_28px_70px_-28px_rgba(var(--color-accent-rgb),0.45)] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={artAt(src, 1024) ?? src} srcSet={artSrcSet(src)} sizes={sizes} alt="" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      <span aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-bg-main/85 via-bg-main/5 to-bg-main/20" />
      <span aria-hidden className="pointer-events-none absolute inset-2 rounded-xl border border-accent/30" />
      <span aria-hidden className={`${CORNER} start-3 top-3 border-s-2 border-t-2`} />
      <span aria-hidden className={`${CORNER} end-3 top-3 border-e-2 border-t-2`} />
      <span aria-hidden className={`${CORNER} bottom-3 start-3 border-b-2 border-s-2`} />
      <span aria-hidden className={`${CORNER} bottom-3 end-3 border-b-2 border-e-2`} />
      {children}
    </figure>
  );
}
