/*
  파일명: /app/(main)/rest/dawn/page.tsx
  기능: 여명 게임 페이지
  책임: 인물 탄생 순서 정렬 게임을 제공한다.
*/

import { getTranslations } from "next-intl/server";
import DawnGameWrapper from "@/components/features/game/dawn/DawnGameWrapper";
import SectionHeader from "@/components/shared/SectionHeader";
import { ARENA_ENGLISH_LABELS } from "@/constants/arena";
import { getGameBackgroundImages } from "@/lib/getGameBackgroundImages";

export async function generateMetadata() {
  const t = await getTranslations("rest.dawn");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function Page() {
  const t = await getTranslations("rest.arena.dawn");
  const bgImages = getGameBackgroundImages("dawn-1");
  return (
    <>
      <SectionHeader
        label={ARENA_ENGLISH_LABELS["dawn"]}
        title={t("label")}
        description={
          <>
            {t("headerDesc")}
            <br />
            <span className="text-text-tertiary text-xs sm:text-sm mt-1 block">
              {t("headerSub")}
            </span>
          </>
        }
      />

      <DawnGameWrapper bgImages={bgImages} />
    </>
  );
}
