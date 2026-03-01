/*
  파일명: /app/(main)/rest/labyrinth/page.tsx
  기능: 미궁 게임 페이지
  책임: 단서를 모아 숨어든 인물을 추적하는 게임을 제공한다.
*/

import LabyrinthGame from "@/components/features/game/labyrinth/LabyrinthGame";
import SectionHeader from "@/components/shared/SectionHeader";
import { getArenaPageTitle, ARENA_SECTION_HEADERS } from "@/constants/arena";
import { getGameBackgroundImages } from "@/lib/getGameBackgroundImages";

export const metadata = {
  title: getArenaPageTitle("labyrinth"),
  description: "용의자 6인의 단서를 분석해 숨어든 인물을 추적하는 미궁 게임. 도주하기 전에 찾아내세요.",
};

const headerInfo = ARENA_SECTION_HEADERS["labyrinth"];

export default function Page() {
  const bgImages = getGameBackgroundImages("labyrinth-1");
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

      <LabyrinthGame bgImages={bgImages} />
    </>
  );
}
