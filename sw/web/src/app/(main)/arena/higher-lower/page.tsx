/*
  파일명: /app/(main)/arena/higher-lower/page.tsx
  기능: 업다운 게임 페이지
  책임: 셀럽 영향력 비교 게임을 제공한다.
*/ // ------------------------------

import HigherLowerGame from "@/components/features/game/HigherLowerGame";
import SectionHeader from "@/components/shared/SectionHeader";
import { getArenaPageTitle, ARENA_SECTION_HEADERS } from "@/constants/arena";

export const metadata = { title: getArenaPageTitle("higher-lower") };

const headerInfo = ARENA_SECTION_HEADERS["higher-lower"];

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
      <HigherLowerGame />
    </>
  );
}
