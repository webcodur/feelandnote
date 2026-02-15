/*
  파일명: /app/(main)/rest/dawn/page.tsx
  기능: 여명 게임 페이지
  책임: 인물 탄생 순서 정렬 게임을 제공한다.
*/ // ------------------------------

import TimelineGame from "@/components/features/game/TimelineGame";
import SectionHeader from "@/components/shared/SectionHeader";
import { getArenaPageTitle, ARENA_SECTION_HEADERS } from "@/constants/arena";

export const metadata = { title: getArenaPageTitle("dawn") };

const headerInfo = ARENA_SECTION_HEADERS["dawn"];

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
