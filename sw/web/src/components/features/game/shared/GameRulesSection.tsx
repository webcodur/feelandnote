/*
  파일명: components/features/game/shared/GameRulesSection.tsx
  기능: 규칙 화면 섹션 구분자
  책임: border-t + 패딩 + 선택적 파트 라벨 + 소제목 패턴을 단일 컴포넌트로 제공.
*/

import type { ReactNode } from "react";

interface GameRulesSectionProps {
  partLabel?: string;
  title: string;
  children: ReactNode;
}

export default function GameRulesSection({ partLabel, title, children }: GameRulesSectionProps) {
  return (
    <div className="border-t border-white/[0.06] pt-10 pb-12 px-6">
      <div className="text-center mb-6">
        {partLabel && (
          <p className="text-[10px] font-cinzel text-accent/40 uppercase tracking-[0.4em] mb-1">{partLabel}</p>
        )}
        <h3 className="text-lg font-serif font-black text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}
