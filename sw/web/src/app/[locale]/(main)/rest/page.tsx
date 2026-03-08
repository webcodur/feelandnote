/*
  파일명: /app/(main)/rest/page.tsx
  기능: 쉼터 허브 페이지
  책임: 쉼터의 게임들을 카드로 보여주고 각 페이지로 안내한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { Clock, Crosshair, Swords, Crown } from "lucide-react";
import HubNav from "@/components/shared/HubNav";
import type { HubNavItem } from "@/components/shared/HubNav";
import RestGameGrid from "@/components/features/rest/RestGameGrid";
import { getGameBackgroundImages } from "@/lib/getGameBackgroundImages";
import { loadSuikodenCharacters, loadSuikodenDialogues } from "@/actions/game/suikoden";

export async function generateMetadata() {
  const t = await getTranslations("rest.meta");
  return { title: t("title"), description: t("description") };
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

  const navItems: HubNavItem[] = GAME_SECTIONS.map((game) => ({
    label: t(`${game.valueKey}.label` as any),
    href: game.href,
    icon: game.icon,
  }));

  return (
    <div className="space-y-8">
      {/* 서브페이지 네비게이터 */}
      <HubNav items={navItems} placeholder={tHub("quickNav")} />

      {/* 카드 그리드 및 게임 렌더링 */}
      <RestGameGrid 
        bgImagesDawn={bgImagesDawn}
        bgImagesLabyrinth={bgImagesLabyrinth}
        bgImagesHegemony={bgImagesHegemony}
        suikodenCharacters={suikodenCharacters}
        suikodenDialogues={suikodenDialogues}
      />
    </div>
  );
}
