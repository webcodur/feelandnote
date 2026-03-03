/*
  파일명: /app/(main)/rest/suikoden/page.tsx
  기능: 천도 — 셀럽 전략 시뮬레이션
  책임: 게임 데이터를 서버에서 로딩하고 클라이언트 게임 컴포넌트에 전달한다.
*/

import { getTranslations } from "next-intl/server";
import { loadSuikodenCharacters, loadSuikodenDialogues } from "@/actions/game/suikoden";
import SuikodenGameWrapper from "@/components/features/game/suikoden/SuikodenGameWrapper";
import SectionHeader from "@/components/shared/SectionHeader";
import { ARENA_ENGLISH_LABELS } from "@/constants/arena";
import DevGate from "./DevGate";

export async function generateMetadata() {
  const t = await getTranslations("rest.suikoden");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function Page() {
  const t = await getTranslations("rest.arena.suikoden");
  const characters = await loadSuikodenCharacters();
  const dialogues = await loadSuikodenDialogues();

  return (
    <>
      <SectionHeader
        label={ARENA_ENGLISH_LABELS["suikoden"]}
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

      <DevGate>
        <SuikodenGameWrapper characters={characters} dialogues={dialogues} />
      </DevGate>
    </>
  );
}
