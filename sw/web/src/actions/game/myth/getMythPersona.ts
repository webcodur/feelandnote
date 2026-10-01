/*
  파일명: actions/game/myth/getMythPersona.ts
  기능: 신화 인물 성향 수치
  책임: 성향 수치(celeb_persona)가 있는 신화 인물만 골라 통솔·무력·지력·매력을 돌려준다(915명 가운데 약 143명).
        없는 인물의 게임 능력치는 각 게임이 규칙으로 정하고, 화면에 「게임 능력치」라고 밝힌다.
*/ // ------------------------------
import "server-only";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { selectInChunks } from "@feelandnote/shared/lib/paginate";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { createStaticClient } from "@/lib/db/static";
import { isMythFixtureMode } from "@/components/features/game/myth/shared/fixture";
import type { MythPersona } from "@/components/features/game/myth/shared/types";

interface PersonaRow {
  celeb_id: string;
  command: number | null;
  martial: number | null;
  intellect: number | null;
  charm: number | null;
}

const score = (value: number | null) => (typeof value === "number" && Number.isFinite(value) ? value : null);

async function fetchPersona(figureIds: string[]): Promise<Record<string, MythPersona>> {
  const db = createStaticClient();
  const rows = await selectInChunks<PersonaRow>(figureIds, (ids) => db.from("celeb_persona")
    .select("celeb_id,command,martial,intellect,charm").in("celeb_id", ids)
    .overrideTypes<PersonaRow[], { merge: false }>());
  return Object.fromEntries(rows.flatMap((row) => {
    const values = [score(row.command), score(row.martial), score(row.intellect), score(row.charm)];
    if (values.some((value) => value === null)) return [];
    const [command, martial, intellect, charm] = values as number[];
    return [[row.celeb_id, { command, martial, intellect, charm }]];
  }));
}

const getCachedPersona = unstable_cache(fetchPersona, ["myth-game-persona-v1"], {
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.SPECTRUM, CACHE_TAGS.FACTIONS],
});

// figureIds는 getMythWorld()의 인물 id 전부를 넘긴다(순서를 고정해 캐시 키가 흔들리지 않게 정렬한다)
export async function getMythPersona(figureIds: string[]): Promise<Record<string, MythPersona>> {
  if (isMythFixtureMode() || figureIds.length === 0) return {};
  try {
    return await getCachedPersona([...figureIds].sort());
  } catch (error) {
    console.error("[myth-game] 성향 수치 조회 실패 → 규칙 능력치만 씀:", error);
    return {};
  }
}
