/*
  파일명: /app/(main)/rest/labyrinth/page.tsx
  기능: 미궁 게임 페이지
  책임: 단서를 모아 숨어든 인물을 추적하는 게임을 제공한다.
*/

import { getTranslations } from "next-intl/server";
import LabyrinthGame from "@/components/features/game/labyrinth/LabyrinthGame";
import SectionHeader from "@/components/shared/SectionHeader";
import { ARENA_ENGLISH_LABELS } from "@/constants/arena";
import { getGameBackgroundImages } from "@/lib/getGameBackgroundImages";

export async function generateMetadata() {
  const t = await getTranslations("rest.labyrinth");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function Page() {
  const t = await getTranslations("rest.arena.labyrinth");
  const bgImages = getGameBackgroundImages("labyrinth-1");
  return (
    <>
      <SectionHeader
        label={ARENA_ENGLISH_LABELS["labyrinth"]}
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

      <LabyrinthGame bgImages={bgImages} />
    </>
  );
}
