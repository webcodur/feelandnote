/*
  파일명: /components/shared/AtlasStage.tsx
  기능: 공용 무대 프레임 — 도감 화면의 본문을 한 상자에 묶는다
  책임: 둥근 외곽 상자(28px·헤어라인 경계)를 그린다. accent를 넘기면 상단에
        문맥색 헤어라인과 광원을 깐다 — 스펙트럼 축 무대·기질의 서재·분야별 챔피언이
        같은 상자를 쓰고 색만 바꿔 입는다.
*/ // ------------------------------

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function AtlasStage({
  accent, children, className,
}: {
  /** 상단 헤어라인·광원의 문맥색(축색·매체색). 없으면 장식 없는 평범한 상자 */
  accent?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0a0a0c]", className)}>
      {accent && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent 10%, ${accent}80 50%, transparent 90%)` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-72"
            style={{ background: `radial-gradient(ellipse 55% 100% at 50% 0%, ${accent}30, transparent 70%)` }}
          />
        </>
      )}
      <div className="relative">{children}</div>
    </section>
  );
}
