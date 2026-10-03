/*
  파일명: /app/(main)/rest/page.tsx
  기능: 쉼터 허브 페이지
  책임: 홈과 같은 번호 구획·목차로 게임을 소개하고 카드에서 전체화면 게임을 연다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import AtlasNavSections from "@/components/shared/atlasNav/AtlasNavSections";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { hubAtlasNavItems } from "@/components/shared/hubSectionUtils";
import RestGameGrid from "@/components/features/rest/RestGameGrid";
import { REST_GAMES, REST_GROUP_ID, type GameId } from "@/constants/rest-games";
import { getGameBackgroundImages } from "@/lib/getGameBackgroundImages";
import { loadSuikodenCharacters, loadSuikodenDialogues } from "@/actions/game/suikoden";
import { loadWanderPools } from "@/actions/game/wander";
import { getMemoryFigures } from "@/actions/game/getMemoryFigures";
import { getPortraitFigures } from "@/actions/game/getPortraitFigures";

export async function generateMetadata() {
  const t = await getTranslations("rest.meta");
  return { title: t("title"), description: t("description"), alternates: await getLocalizedAlternates("/rest") };
}

interface RestPageProps {
  searchParams: Promise<{ dev?: string }>;
}

export default async function RestPage({ searchParams }: RestPageProps) {
  const t = await getTranslations("rest.arena");
  const tHub = await getTranslations("rest.hub");

  const { dev } = await searchParams;
  const devMode = process.env.NODE_ENV === "development" || dev === "1";
  const visibleSections = REST_GAMES.filter((game) => devMode || !game.dev);

  // 배경 이미지는 동기 fs 읽기라 가볍다 — 그대로 기다린다
  const [bgImagesDawn, bgImagesLabyrinth] = await Promise.all([
    getGameBackgroundImages("dawn-1"),
    getGameBackgroundImages("labyrinth-1"),
  ]);

  // 개발자 모드에서만 천도 자료를 조회하며 카드 격자는 완료를 기다리지 않는다.
  const suikodenCharactersPromise = devMode ? loadSuikodenCharacters() : Promise.resolve([]);
  const suikodenDialoguesPromise = devMode ? loadSuikodenDialogues() : Promise.resolve({});

  // 기억은 공개 게임이라 늘 조회한다. 미공개 게임 자료는 개발자 모드에서만 받아 평소 통신량을 늘리지 않는다
  const [memoryFigures, wanderPools, portraitFigures] = await Promise.all([
    getMemoryFigures(),
    devMode ? loadWanderPools() : Promise.resolve(null),
    devMode ? getPortraitFigures() : Promise.resolve(null),
  ]);

  const atlasItems = hubAtlasNavItems(visibleSections.map((game) => t(`${game.valueKey}.label`)), REST_GROUP_ID);

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
    // 좁은 화면에서는 하단 목차 띠가 본문 위에 떠 있다 — 마지막 줄이 가리지 않게 비운다
    <AsyncIntlProvider>
      <div className="pb-[60px] min-[1340px]:pb-8">
        {/* 서브페이지 네비게이터 — 공용 아틀라스 목차(옆 레일·하단 띠) */}
        <AtlasNavSections items={atlasItems} />

        {/* 게임별 번호 구획과 실행 카드 */}
        <RestGameGrid
          bgImagesDawn={bgImagesDawn}
          bgImagesLabyrinth={bgImagesLabyrinth}
          suikodenCharactersPromise={suikodenCharactersPromise}
          suikodenDialoguesPromise={suikodenDialoguesPromise}
          wanderPools={wanderPools}
          memoryFigures={memoryFigures}
          portraitFigures={portraitFigures}
          gameLabels={gameLabels}
          devMode={devMode}
        />
      </div>
    </AsyncIntlProvider>
  );
}
