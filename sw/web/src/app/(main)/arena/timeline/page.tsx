/*
  파일명: /app/(main)/arena/timeline/page.tsx
  기능: 연대기 게임 페이지
  책임: 콘텐츠 연대기 정렬 게임을 제공한다.
*/ // ------------------------------

import TimelineGame from "@/components/features/game/TimelineGame";
import SectionHeader from "@/components/shared/SectionHeader";
import { getArenaPageTitle, ARENA_SECTION_HEADERS } from "@/constants/arena";

export const metadata = { title: getArenaPageTitle("timeline") };

const headerInfo = ARENA_SECTION_HEADERS.timeline;

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
