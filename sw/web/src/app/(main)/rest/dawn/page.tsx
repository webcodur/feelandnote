/*
  파일명: /app/(main)/rest/dawn/page.tsx
  기능: 여명 게임 페이지
  책임: 인물 탄생 순서 정렬 게임을 제공한다.
*/

import DawnGameWrapper from "@/components/features/game/dawn/DawnGameWrapper";
import SectionHeader from "@/components/shared/SectionHeader";
import { getArenaPageTitle, ARENA_SECTION_HEADERS } from "@/constants/arena";
import { getGameBackgroundImages } from "@/lib/getGameBackgroundImages";

export const metadata = {
  title: getArenaPageTitle("dawn"),
  description: "역사 속 인물들의 탄생 순서를 맞추는 퀴즈 게임. 당신의 역사 지식을 시험하세요.",
};

const headerInfo = ARENA_SECTION_HEADERS["dawn"];

export default function Page() {
  const bgImages = getGameBackgroundImages("dawn-1");
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

      <DawnGameWrapper bgImages={bgImages} />
    </>
  );
}
