"use client";

import type { ReactNode } from "react";

/* 상품 선반 모드(감상·추천)도 작품 고름틀과 같은 새김 상자+노이즈 질감으로 감싼다 —
   같은 구획 안에서 표면 재질이 갈리지 않게. 헤더 스트립도 고름틀과 같은 모양이라
   어떤 모드든 맨 위에서 무엇을 모은 책인지 읽힌다 */
export default function ShelfMode({ intro, children }: { intro: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-accent-dim/50 bg-stone-heavy shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
      <header className="relative flex min-h-11 items-center justify-start bg-bg-secondary/55 pe-3 ps-8 py-2 text-start before:absolute before:inset-y-2.5 before:start-3 before:w-0.5 before:rounded-full before:bg-accent/80 before:content-['']">
        <p className="min-w-0 truncate text-[15px] font-medium leading-5 tracking-[0.01em] text-text-secondary">
          {intro}
        </p>
      </header>
      <div className="relative bg-stone-heavy bg-texture-noise px-2 py-2.5 sm:px-3 sm:py-3 md:px-4">
        {children}
      </div>
    </section>
  );
}
