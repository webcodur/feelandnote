/*
  파일명: /app/(main)/rest/page.tsx
  기능: 쉼터 허브 페이지
  책임: 쉼터의 게임들을 카드로 보여주고 각 페이지로 안내한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getAlternates } from "@/lib/seo";
import { Clock, Crosshair, Swords, Crown } from "lucide-react";
import HubNav from "@/components/shared/HubNav";
import RestGameGrid from "@/components/features/rest/RestGameGrid";
import { getGameBackgroundImages } from "@/lib/getGameBackgroundImages";
import { loadSuikodenCharacters, loadSuikodenDialogues } from "@/actions/game/suikoden";

export async function generateMetadata() {
  const t = await getTranslations("rest.meta");
  return { title: t("title"), description: t("description"), alternates: getAlternates("/rest") };
}

// #region 게임 정의
const GAME_SECTIONS = [
  {
    href: "/rest#dawn",
    valueKey: "dawn" as const,
    label: "DAWN",
    icon: <Clock className="h-5 w-5" />,
  },
  {
    href: "/rest#labyrinth",
    valueKey: "labyrinth" as const,
    label: "LABYRINTH",
    icon: <Crosshair className="h-5 w-5" />,
  },
  {
    href: "/rest#hegemony",
    valueKey: "hegemony" as const,
    label: "HEGEMONY",
    icon: <Swords className="h-5 w-5" />,
  },
  {
    href: "/rest#suikoden",
    valueKey: "suikoden" as const,
    label: "CHEONDO",
    icon: <Crown className="h-5 w-5" />,
  },
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
  ] = await Promise.all([
    getGameBackgroundImages("dawn-1"),
    getGameBackgroundImages("labyrinth-1"),
    getGameBackgroundImages("hegemony-1"),
    loadSuikodenCharacters(),
    loadSuikodenDialogues(),
  ]);

  const hubItems = GAME_SECTIONS.map((game) => ({
    label: t(`${game.valueKey}.label` as any),
    href: game.href,
    icon: game.icon,
  }));

  const gameLabels = Object.fromEntries(
    GAME_SECTIONS.map((game) => [
      game.valueKey,
      {
        title: t(`${game.valueKey}.label` as any),
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
        gameLabels={gameLabels}
      />
    </div>
  );
}
