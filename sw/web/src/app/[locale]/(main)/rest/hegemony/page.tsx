/*
  파일명: /app/(main)/rest/hegemony/page.tsx
  기능: 패권 게임 페이지
  책임: 셀럽 영향력 카드를 이용한 1:1 전략 대전을 제공한다.
*/

import { getTranslations } from "next-intl/server";
import HegemonyGame from "@/components/features/game/battle/HegemonyGame";
import SectionHeader from "@/components/shared/SectionHeader";
import { ARENA_ENGLISH_LABELS } from "@/constants/arena";
import { getGameBackgroundImages } from "@/lib/getGameBackgroundImages";

export async function generateMetadata() {
  const t = await getTranslations("rest.hegemony");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function Page() {
  const t = await getTranslations("rest.arena.hegemony");
  const bgImages = getGameBackgroundImages("hegemony-1");
  return (
    <>
      <SectionHeader
        label={ARENA_ENGLISH_LABELS["hegemony"]}
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

      <HegemonyGame bgImages={bgImages} />
    </>
  );
}
