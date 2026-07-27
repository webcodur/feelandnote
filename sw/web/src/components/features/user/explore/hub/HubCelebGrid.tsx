/*
  파일명: /components/features/user/explore/hub/HubCelebGrid.tsx
  기능: 허브 페이지 셀럽 그리드
  책임: CelebCard를 6컬럼(모바일 3) 그리드로 배치하고 대사 자막을 표시한다.
*/ // ------------------------------

"use client";

import CelebCard from "@/components/shared/CelebCard";
import { useDialogueSubtitle } from "@/components/features/game/shared/hooks/useDialogue";
import type { CelebProfile } from "@/types/home";

interface HubCelebGridProps {
  celebs: CelebProfile[];
}

export default function HubCelebGrid({ celebs }: HubCelebGridProps) {
  const { handleSubtitle } = useDialogueSubtitle();

  if (celebs.length === 0) return null;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
      {celebs.map((celeb) => (
        <CelebCard
          key={celeb.id}
          id={celeb.id}
          nickname={celeb.nickname}
          avatar_url={celeb.avatar_url}
          title={celeb.title}
          count={celeb.content_count}
          recentViews={celeb.recent_views}
          celebProfile={celeb}
          variant="card"
          shape="square"
          onSubtitle={handleSubtitle}
        />
      ))}
    </div>
  );
}
