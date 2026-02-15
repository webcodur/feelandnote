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
    <div className="space-y-2 max-w-lg mx-auto">
      <p className="text-[10px] text-text-tertiary font-cinzel uppercase tracking-wider text-center">
        Stage 3 — Philosophy
      </p>
      <div className="rounded-lg border border-white/15 bg-black/30 p-4 sm:p-5">
        <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
          {philosophy}
        </p>
      </div>
    </div>
  );
}
