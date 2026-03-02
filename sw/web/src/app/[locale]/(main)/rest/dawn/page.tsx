/*
  파일명: /app/(main)/rest/dawn/page.tsx
  기능: 여명 게임 페이지
  책임: 인물 탄생 순서 정렬 게임을 제공한다.
*/

import { getTranslations } from "next-intl/server";
import DawnGameWrapper from "@/components/features/game/dawn/DawnGameWrapper";
import SectionHeader from "@/components/shared/SectionHeader";
import { ARENA_SECTION_HEADERS } from "@/constants/arena";
import { getGameBackgroundImages } from "@/lib/getGameBackgroundImages";

export async function generateMetadata() {
  const t = await getTranslations("rest.dawn");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

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
