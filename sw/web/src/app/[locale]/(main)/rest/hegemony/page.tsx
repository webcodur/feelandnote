/*
  파일명: /app/(main)/rest/hegemony/page.tsx
  기능: 패권 게임 페이지
  책임: 셀럽 영향력 카드를 이용한 1:1 전략 대전을 제공한다.
*/

import { getTranslations } from "next-intl/server";
import HegemonyGame from "@/components/features/game/battle/HegemonyGame";
import SectionHeader from "@/components/shared/SectionHeader";
import { ARENA_SECTION_HEADERS } from "@/constants/arena";
import { getGameBackgroundImages } from "@/lib/getGameBackgroundImages";

export async function generateMetadata() {
  const t = await getTranslations("rest.hegemony");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

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
