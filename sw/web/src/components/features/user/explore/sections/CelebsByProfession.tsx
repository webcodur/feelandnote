/*
  파일명: /components/features/user/explore/sections/CelebsByProfession.tsx
  기능: 직군별 인물 캐러셀 목록
  책임: 직군마다 대표 인물을 가로로 늘어놓는다. 통계 버튼·모달은 CelebStatsBar가 별도 레인에서 맡는다.
*/ // ------------------------------

"use client";

import ProfessionCarousel from "../ProfessionCarousel";
import { useDialogueSubtitle } from "@/components/features/game/shared/hooks/useDialogue";
import type { ProfessionSection } from "@/actions/home";

interface CelebsByProfessionProps {
  sections: ProfessionSection[];
}

export default function CelebsByProfession({ sections }: CelebsByProfessionProps) {
  const { handleSubtitle } = useDialogueSubtitle();

  return (
    <div className="space-y-8 md:space-y-10">
      {sections.map((section) => (
        <ProfessionCarousel
          key={section.profession}
          profession={section.profession}
          label={section.label}
          celebs={section.celebs}
          totalCount={section.totalCount}
          onSubtitle={handleSubtitle}
        />
      ))}
    </div>
  );
}
