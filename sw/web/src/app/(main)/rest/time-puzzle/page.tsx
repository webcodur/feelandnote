/*
  파일명: /app/(main)/rest/time-puzzle/page.tsx
  기능: 타임퍼즐 게임 페이지
  책임: 인물 탄생 순서 정렬 게임을 제공한다.
*/ // ------------------------------

import TimelineGame from "@/components/features/game/TimelineGame";
import SectionHeader from "@/components/shared/SectionHeader";
import { getArenaPageTitle, ARENA_SECTION_HEADERS } from "@/constants/arena";

export const metadata = { title: getArenaPageTitle("time-puzzle") };

const headerInfo = ARENA_SECTION_HEADERS["time-puzzle"];

export default function Page() {
  return (
    <>
      <SectionHeader
        label={headerInfo.label}
        title={headerInfo.title}
        description={
          <>
            {headerInfo.description}
            {headerInfo.subDescription && (
              <>
                <br />
                <span className="text-text-tertiary text-xs sm:text-sm mt-1 block">
                  {headerInfo.subDescription}
                </span>
              </>
            )}
          </>
        }
      />
      <TimelineGame />
    </>
  );
}
