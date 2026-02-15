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
    <div className="space-y-2 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-2">
      <p className="text-[10px] text-text-tertiary font-cinzel uppercase tracking-wider text-center">
        Stage 5 — Quotes
      </p>
      <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
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
