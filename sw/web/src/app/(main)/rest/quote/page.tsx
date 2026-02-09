/*
  파일명: /app/(main)/rest/quote/page.tsx
  기능: 인물찾기 게임 페이지
  책임: 명언을 보고 인물을 맞추는 퀴즈 게임을 제공한다.
*/

import QuoteGame from "@/components/features/game/QuoteGame";
import SectionHeader from "@/components/shared/SectionHeader";
import { getArenaPageTitle, ARENA_SECTION_HEADERS } from "@/constants/arena";

export const metadata = { title: getArenaPageTitle("quote") };

const headerInfo = ARENA_SECTION_HEADERS["quote"];

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
      <QuoteGame />
    </>
  );
}
