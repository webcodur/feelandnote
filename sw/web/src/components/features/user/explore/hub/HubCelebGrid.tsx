/*
  파일명: /components/features/user/explore/hub/HubCelebGrid.tsx
  기능: 허브 페이지 셀럽 그리드
  책임: CelebCard를 6컬럼(모바일 3) 그리드로 배치하고 대사 자막을 표시한다.
*/ // ------------------------------

"use client";

import CelebCard from "@/components/shared/CelebCard";
import { useDialogueSubtitle } from "@/components/features/game/shared/hooks/useDialogue";
import type { CelebProfile } from "@/types/home";
import { HUB_CELEB_GRID } from "./ExploreSkeleton";

interface HubCelebGridProps {
  celebs: CelebProfile[];
}

export default function HubCelebGrid({ celebs }: HubCelebGridProps) {
  const { handleSubtitle } = useDialogueSubtitle();

  if (celebs.length === 0) return null;

  return (
    /* 한 줄 장수는 한 단계씩만 늘린다. 4장에서 6장으로 건너뛰면 창을 넓히는데 카드가 38% 작아져
       크기가 크게 뒷걸음질 친다. 5장을 거치면 낙차가 절반으로 줄어든다. */
    <div className={HUB_CELEB_GRID}>
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
