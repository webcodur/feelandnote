/*
  파일명: /app/(main)/rest/page.tsx
  기능: 쉼터 허브 페이지
  책임: 쉼터의 게임들을 카드로 보여주고 각 페이지로 안내한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import HubNav from "@/components/shared/HubNav";
import RestGameGrid from "@/components/features/rest/RestGameGrid";
import { getGameBackgroundImages } from "@/lib/getGameBackgroundImages";
import { loadSuikodenCharacters, loadSuikodenDialogues } from "@/actions/game/suikoden";
// 기억궁 비공개(26.07.28): 구현은 보존하고 /rest 등록만 주석 처리한다.
// import { getMemoryFigures } from "@/actions/game/getMemoryFigures";
import { getPortraitFigures } from "@/actions/game/getPortraitFigures";

export async function generateMetadata() {
  const t = await getTranslations("rest.meta");
  return { title: t("title"), description: t("description"), alternates: await getLocalizedAlternates("/rest") };
}

// #region 게임 정의
const GAME_SECTIONS = [
  { href: "/rest#dawn",      valueKey: "dawn" as const },
  { href: "/rest#labyrinth", valueKey: "labyrinth" as const },
  { href: "/rest#hegemony",  valueKey: "hegemony" as const },
  { href: "/rest#suikoden",  valueKey: "suikoden" as const },
  // { href: "/rest#memory", valueKey: "memory" as const },
  // 시대의 초상 비공개(26.07.30): 구현은 보존하고 공개 바로가기만 숨긴다.
  // { href: "/rest#portrait", valueKey: "portrait" as const },
] as const;
// #endregion

export default async function RestPage() {
  const t = await getTranslations("rest.arena");
  const tHub = await getTranslations("rest.hub");

  const [
    bgImagesDawn,
    bgImagesLabyrinth,
    bgImagesHegemony,
    suikodenCharacters,
    suikodenDialogues,
    // memoryFigures,
    portraitFigures,
  ] = await Promise.all([
    getGameBackgroundImages("dawn-1"),
    getGameBackgroundImages("labyrinth-1"),
    getGameBackgroundImages("hegemony-1"),
    loadSuikodenCharacters(),
    loadSuikodenDialogues(),
    // getMemoryFigures(),
    getPortraitFigures(),
  ]);

  // 목차 줄 항목 — 아이콘은 아래 게임 카드가 이미 크게 달고 있어 여기서는 번호와 이름만 쓴다
  const hubItems = GAME_SECTIONS.map((game) => ({
    label: t(`${game.valueKey}.label`),
    href: game.href,
  }));

  const gameLabels = Object.fromEntries(
    GAME_SECTIONS.map((game) => [
      game.valueKey,
      {
        title: t(`${game.valueKey}.label`),
        description: tHub(game.valueKey),
      },
    ])
  ) as Record<"dawn" | "labyrinth" | "hegemony" | "suikoden", { title: string; description: string }>;

  return (
    <div className="space-y-8">
      {/* 서브페이지 네비게이터 */}
      <HubNav hubItems={hubItems} />

      {/* 카드 그리드 및 게임 렌더링 */}
      <RestGameGrid
        bgImagesDawn={bgImagesDawn}
        bgImagesLabyrinth={bgImagesLabyrinth}
        bgImagesHegemony={bgImagesHegemony}
        suikodenCharacters={suikodenCharacters}
        suikodenDialogues={suikodenDialogues}
        portraitFigures={portraitFigures}
        gameLabels={gameLabels}
      />
    </div>
  );
}
