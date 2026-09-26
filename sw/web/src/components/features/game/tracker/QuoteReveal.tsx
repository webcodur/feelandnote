/*
  파일명: components/features/game/tracker/QuoteReveal.tsx
  기능: Stage 5 - 한마디 공개
  책임: 인물의 한마디 표시
*/
"use client";

import { useTranslations } from "next-intl";

interface QuoteRevealProps {
  quote: string;
}

export default function QuoteReveal({ quote }: QuoteRevealProps) {
  const tGame = useTranslations("rest.arena.labyrinth.game");

  return (
    <div className="relative rounded-lg border border-white/20 bg-bg-main p-3 sm:p-4 max-w-lg mx-auto max-h-[45vh] overflow-y-auto animate-clue-reveal animate-clue-glow-line">
      <p className="text-[11px] font-cinzel uppercase tracking-wider text-center mb-3">
        {tGame("quoteTitle")}
      </p>
      <blockquote className="rounded border border-white/20 bg-[#0e0e0e] p-5 text-center text-base font-serif text-text-primary leading-relaxed whitespace-pre-line">
        {quote}
      </blockquote>
    </div>
  );
}
