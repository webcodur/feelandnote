/*
  파일명: components/features/game/tracker/BioReveal.tsx
  기능: Stage 4 - 인물 소개(bio) 공개
  책임: 이름 검열된 bio 텍스트 표시
*/
"use client";

import { FileText } from "lucide-react";

interface BioRevealProps {
  bio: string;
}

export default function BioReveal({ bio }: BioRevealProps) {
  return (
    <div className="relative rounded-lg border border-white/20 bg-bg-main p-3 sm:p-4 max-w-lg mx-auto max-h-[45vh] flex flex-col animate-clue-reveal animate-clue-glow-line overflow-hidden">
      <p className="shrink-0 text-[10px] text-text-tertiary font-cinzel uppercase tracking-wider text-center mb-3">
        Stage 4 — Biography
      </p>
      <div className="rounded border border-white/20 bg-[#0e0e0e] p-4 min-h-0 overflow-y-auto">
        <div className="flex items-start gap-2">
          <FileText size={14} className="shrink-0 text-accent mt-0.5" />
          <p className="text-sm text-text-primary leading-relaxed">{bio}</p>
        </div>
      </div>
    </div>
  );
}
