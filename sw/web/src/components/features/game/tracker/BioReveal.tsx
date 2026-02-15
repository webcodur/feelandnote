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
    <div className="space-y-2 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-2">
      <p className="text-[10px] text-text-tertiary font-cinzel uppercase tracking-wider text-center">
        Stage 4 — Biography
      </p>
      <div className="rounded-lg border border-white/15 bg-black/30 p-4">
        <div className="flex items-start gap-2">
          <FileText size={14} className="shrink-0 text-accent mt-0.5" />
          <p className="text-sm text-text-primary leading-relaxed">{bio}</p>
        </div>
      </div>
    </div>
  );
}
