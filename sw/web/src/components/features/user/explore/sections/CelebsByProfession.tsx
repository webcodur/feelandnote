"use client";

import { useState, useCallback } from "react";
import ProfessionCarousel from "../ProfessionCarousel";
import ViewToggle from "../ViewToggle";
import DialogueSubtitle from "@/components/features/game/shared/DialogueSubtitle";
import type { DialogueSubtitleData } from "@/components/features/game/shared/hooks/useDialogue";
import type { ProfessionSection } from "@/actions/home";

interface CelebsByProfessionProps {
  sections: ProfessionSection[];
}

export default function CelebsByProfession({ sections }: CelebsByProfessionProps) {
  const [subtitle, setSubtitle] = useState<DialogueSubtitleData | null>(null);

  const handleSubtitle = useCallback((sub: DialogueSubtitleData) => {
    setSubtitle(sub);
  }, []);

  return (
    <div className="space-y-8 md:space-y-10">
      {/* 뷰 전환 */}
      <div className="flex justify-end">
        <ViewToggle current="carousel" />
      </div>

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

      <DialogueSubtitle subtitle={subtitle} />
    </div>
  );
}
