/*
  파일명: /app/(main)/rest/suikoden/page.tsx
  기능: 천도 — 셀럽 전략 시뮬레이션
  책임: 게임 데이터를 서버에서 로딩하고 클라이언트 게임 컴포넌트에 전달한다.
*/

import { loadSuikodenCharacters, loadSuikodenItems } from "@/actions/game/suikoden";
import SuikodenGameWrapper from "@/components/features/game/suikoden/SuikodenGameWrapper";
import SectionHeader from "@/components/shared/SectionHeader";
import { getArenaPageTitle, ARENA_SECTION_HEADERS } from "@/constants/arena";

export const metadata = {
  title: getArenaPageTitle("suikoden"),
  description: "역사 속 인물들을 모아 나만의 군단을 편성하는 전략 시뮬레이션 게임.",
};

const headerInfo = ARENA_SECTION_HEADERS["suikoden"];

export default async function Page() {
  const characters = await loadSuikodenCharacters();
  const characterIds = characters.slice(0, 100).map((c) => c.id);
  const items = await loadSuikodenItems(characterIds);

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

      <SuikodenGameWrapper characters={characters} items={items} />
    </>
  );
}
