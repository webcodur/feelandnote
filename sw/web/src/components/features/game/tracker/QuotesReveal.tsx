/*
  파일명: components/features/game/tracker/QuotesReveal.tsx
  기능: Stage 5 - 명언(quotes) 공개
  책임: 이름 검열된 명언 표시
*/
"use client";

import { Quote } from "lucide-react";

interface QuotesRevealProps {
  quotes: string;
}

export default function QuotesReveal({ quotes }: QuotesRevealProps) {
  return (
    <div className="relative rounded-lg border border-white/20 bg-bg-main p-3 sm:p-4 max-w-lg mx-auto max-h-[45vh] flex flex-col animate-clue-reveal animate-clue-glow-line overflow-hidden">
      <p className="shrink-0 text-[10px] text-text-tertiary font-cinzel uppercase tracking-wider text-center mb-3">
        Stage 5 — Quotes
      </p>
      <div className="rounded border border-white/20 bg-[#0e0e0e] p-4 min-h-0 overflow-y-auto">
        <div className="flex items-start gap-2">
          <Quote size={14} className="shrink-0 text-accent mt-0.5" />
          <p className="text-sm text-text-primary leading-relaxed italic font-serif">
            &ldquo;{quotes}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
