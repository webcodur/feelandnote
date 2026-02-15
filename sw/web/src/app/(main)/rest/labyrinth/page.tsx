/*
  파일명: /app/(main)/rest/labyrinth/page.tsx
  기능: 미궁 게임 페이지
  책임: 단서를 보고 셀럽을 맞추는 추적 게임을 제공한다.
*/

import TrackerGame from "@/components/features/game/TrackerGame";
import GameFullScreen from "@/components/shared/GameFullScreen";
import SectionHeader from "@/components/shared/SectionHeader";
import { getArenaPageTitle, ARENA_SECTION_HEADERS } from "@/constants/arena";

export const metadata = { title: getArenaPageTitle("labyrinth") };

const headerInfo = ARENA_SECTION_HEADERS["labyrinth"];

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
      <GameFullScreen title={headerInfo.title}>
        <TrackerGame />
      </GameFullScreen>
    </>
  );
}
