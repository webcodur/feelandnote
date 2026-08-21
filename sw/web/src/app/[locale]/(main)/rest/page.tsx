/*
  파일명: /app/(main)/rest/page.tsx
  기능: 쉼터 허브 페이지
  책임: 쉼터의 게임들을 카드로 보여주고 각 페이지로 안내한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import HubNav from "@/components/shared/HubNav";
import RestGameGrid, { type GameId } from "@/components/features/rest/RestGameGrid";
import { getGameBackgroundImages } from "@/lib/getGameBackgroundImages";
import { loadSuikodenCharacters, loadSuikodenDialogues } from "@/actions/game/suikoden";
import { loadWanderPools } from "@/actions/game/wander";
import { getMemoryFigures } from "@/actions/game/getMemoryFigures";
import { getPortraitFigures } from "@/actions/game/getPortraitFigures";

export async function generateMetadata() {
  const t = await getTranslations("rest.meta");
  return { title: t("title"), description: t("description"), alternates: await getLocalizedAlternates("/rest") };
}

// #region 게임 정의
// dev: true — 미공개 게임. 개발자 모드(로컬 개발 서버 또는 ?dev=1)에서만 노출한다.
const GAME_SECTIONS = [
  { href: "/rest#dawn",      valueKey: "dawn" as const,      dev: false },
  { href: "/rest#labyrinth", valueKey: "labyrinth" as const, dev: false },
  { href: "/rest#hegemony",  valueKey: "hegemony" as const,  dev: false },
  { href: "/rest#suikoden",  valueKey: "suikoden" as const,  dev: false },
  { href: "/rest#wander",    valueKey: "wander" as const,    dev: true },
  { href: "/rest#memory",    valueKey: "memory" as const,    dev: false },
  { href: "/rest#portrait",  valueKey: "portrait" as const,  dev: true },
] as const;
// #endregion

interface RestPageProps {
  searchParams: Promise<{ dev?: string }>;
}

export default async function RestPage({ searchParams }: RestPageProps) {
  const t = await getTranslations("rest.arena");
  const tHub = await getTranslations("rest.hub");

  const { dev } = await searchParams;
  const devMode = process.env.NODE_ENV === "development" || dev === "1";
  const visibleSections = GAME_SECTIONS.filter((game) => devMode || !game.dev);

  // 배경 이미지는 동기 fs 읽기라 가볍다 — 그대로 기다린다
  const [bgImagesDawn, bgImagesLabyrinth, bgImagesHegemony] = await Promise.all([
    getGameBackgroundImages("dawn-1"),
    getGameBackgroundImages("labyrinth-1"),
    getGameBackgroundImages("hegemony-1"),
  ]);

  // 천도(수이코덴) 인물·대사 조회는 기다리지 않는다 — 카드 격자를 붙잡지 않고,
  // 실제로 천도 카드를 열 때(SuikodenSlot)만 완료를 기다린다
  const suikodenCharactersPromise = loadSuikodenCharacters();
  const suikodenDialoguesPromise = loadSuikodenDialogues();

  // 기억은 공개 게임이라 늘 조회한다. 미공개 게임 자료는 개발자 모드에서만 받아 평소 통신량을 늘리지 않는다
  const [memoryFigures, wanderPools, portraitFigures] = await Promise.all([
    getMemoryFigures(),
    devMode ? loadWanderPools() : Promise.resolve(null),
    devMode ? getPortraitFigures() : Promise.resolve(null),
  ]);

  // 목차 줄 항목 — 아이콘은 아래 게임 카드가 이미 크게 달고 있어 여기서는 번호와 이름만 쓴다
  const hubItems = visibleSections.map((game) => ({
    label: t(`${game.valueKey}.label`),
    href: game.href,
  }));

  const gameLabels = Object.fromEntries(
    visibleSections.map((game) => [
      game.valueKey,
      {
        title: t(`${game.valueKey}.label`),
        description: tHub(game.valueKey),
      },
    ])
  ) as Partial<Record<GameId, { title: string; description: string }>>;

  return (
    <div className="space-y-8">
      {/* 서브페이지 네비게이터 */}
      <HubNav hubItems={hubItems} />

      {/* 카드 그리드 및 게임 렌더링 */}
      <RestGameGrid
        bgImagesDawn={bgImagesDawn}
        bgImagesLabyrinth={bgImagesLabyrinth}
        bgImagesHegemony={bgImagesHegemony}
        suikodenCharactersPromise={suikodenCharactersPromise}
        suikodenDialoguesPromise={suikodenDialoguesPromise}
        wanderPools={wanderPools}
        memoryFigures={memoryFigures}
        portraitFigures={portraitFigures}
        gameLabels={gameLabels}
        devMode={devMode}
      />
    </div>
  );
}
