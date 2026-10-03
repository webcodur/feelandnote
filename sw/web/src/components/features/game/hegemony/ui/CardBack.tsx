/*
  파일명: components/features/game/hegemony/ui/CardBack.tsx
  기능: 카드 뒷면
  책임: 공개 전 상대 출전 카드 자리를 왕관 문양 뒷면으로 채운다. 인물 카드와 같은 비율을 쓴다.
*/

import { Crown } from "lucide-react";

export default function CardBack({ label }: { label?: string }) {
  return (
    <div className="relative flex w-full flex-col overflow-hidden rounded-xl border border-hg-enemy/40 bg-hg-raised">
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-hg-ink">
        <div className="absolute inset-3 rounded-lg border border-hg-enemy/25" />
        <div className="absolute inset-6 rounded-md border border-hg-enemy/15" />
        <Crown size={60} className="text-hg-enemy/35" aria-hidden />
      </div>
      <div className="flex h-12 items-center justify-center px-2 text-center text-sm font-bold leading-tight text-text-secondary">{label}</div>
    </div>
  );
}
