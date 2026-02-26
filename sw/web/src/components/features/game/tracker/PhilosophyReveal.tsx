/*
  파일명: components/features/game/tracker/PhilosophyReveal.tsx
  기능: Stage 3 - 감상철학 공개
  책임: consumption_philosophy 전문 표시
*/
"use client";

interface PhilosophyRevealProps {
  philosophy: string;
}

export default function PhilosophyReveal({ philosophy }: PhilosophyRevealProps) {
  return (
    <div className="relative rounded-lg border border-white/20 bg-bg-main p-3 sm:p-4 max-w-lg mx-auto max-h-[45vh] flex flex-col animate-clue-reveal animate-clue-glow-line overflow-hidden">
      <p className="shrink-0 text-[10px] text-text-tertiary font-cinzel uppercase tracking-wider text-center mb-3">
        Stage 3 — Philosophy
      </p>
      <div className="rounded border border-white/20 bg-[#0e0e0e] p-4 min-h-0 overflow-y-auto">
        <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
          {philosophy}
        </p>
      </div>
    </div>
  );
}
