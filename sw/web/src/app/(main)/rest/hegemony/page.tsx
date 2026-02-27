/*
  파일명: /app/(main)/rest/hegemony/page.tsx
  기능: 패권 게임 페이지
  책임: 셀럽 영향력 카드를 이용한 1:1 전략 대전을 제공한다.
*/

import HegemonyGame from "@/components/features/game/battle/HegemonyGame";
import SectionHeader from "@/components/shared/SectionHeader";
import { getArenaPageTitle, ARENA_SECTION_HEADERS } from "@/constants/arena";
import { getGameBackgroundImages } from "@/lib/getGameBackgroundImages";

export const metadata = {
  title: getArenaPageTitle("hegemony"),
  description: "셀럽 영향력 카드로 겨루는 1:1 전략 대전. 역사 속 인물들의 능력치로 승부하세요.",
};

const headerInfo = ARENA_SECTION_HEADERS["hegemony"];

export default function Page() {
  const bgImages = getGameBackgroundImages("hegemony-1");
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

      <HegemonyGame bgImages={bgImages} />
    </>
  );
}
