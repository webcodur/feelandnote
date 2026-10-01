/*
  파일명: components/features/game/myth/shared/Plate.tsx
  기능: 신화 게임 새김판 틀과 장식
  책임: 돌판 위에 금테 안쪽 선과 네 모서리 꺾쇠를 두른 틀(Plate), 가운데 마름모가 박힌 금선(GoldRule),
        양옆에 금선을 단 작은 이름표(Eyebrow), 되짚기 구획 머리(SectionTitle)를 준다. 장식은 모두 읽기 도구가 건너뛴다.
*/ // ------------------------------
import type { ReactNode } from "react";

type PlateTone = "stone" | "gold" | "correct" | "wrong";

const TONE: Record<PlateTone, string> = {
  stone: "border-border",
  gold: "border-accent-dim",
  correct: "border-status-watching",
  wrong: "border-status-paused",
};

const CORNER = "pointer-events-none absolute h-3 w-3 border-accent";

interface PlateProps {
  children: ReactNode;
  className?: string;
  tone?: PlateTone;
  // 모서리 꺾쇠. 작은 칸에서는 끈다
  corners?: boolean;
}

export default function Plate({ children, className = "", tone = "stone", corners = true }: PlateProps) {
  return (
    <div className={`relative rounded-xl border bg-bg-card/85 shadow-2xl backdrop-blur-sm ${TONE[tone]} ${className}`}>
      <span aria-hidden className="pointer-events-none absolute inset-1 rounded-[10px] border border-accent/10" />
      {corners && (
        <>
          <span aria-hidden className={`${CORNER} start-1.5 top-1.5 border-s border-t`} />
          <span aria-hidden className={`${CORNER} end-1.5 top-1.5 border-e border-t`} />
          <span aria-hidden className={`${CORNER} bottom-1.5 start-1.5 border-b border-s`} />
          <span aria-hidden className={`${CORNER} bottom-1.5 end-1.5 border-b border-e`} />
        </>
      )}
      {children}
    </div>
  );
}

export function GoldRule({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center gap-3 ${className}`}>
      <span className="h-px flex-1 bg-linear-to-r from-transparent via-accent-dim to-accent" />
      <span className="h-2 w-2 rotate-45 border border-accent bg-bg-main" />
      <span className="h-px flex-1 bg-linear-to-l from-transparent via-accent-dim to-accent" />
    </div>
  );
}

// 결과 화면 되짚기 구획의 머리 — 이름 옆으로 금선이 흐려지며 뻗는다
export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h3 className="shrink-0 text-base font-bold text-text-primary">{children}</h3>
      <span aria-hidden className="h-px flex-1 bg-linear-to-r from-accent-dim to-transparent" />
      {aside}
    </div>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-center gap-2.5 text-sm font-semibold tracking-[0.2em] text-accent ${className}`}>
      <span aria-hidden className="h-px w-6 bg-linear-to-r from-transparent to-accent" />
      <span>{children}</span>
      <span aria-hidden className="h-px w-6 bg-linear-to-l from-transparent to-accent" />
    </p>
  );
}
