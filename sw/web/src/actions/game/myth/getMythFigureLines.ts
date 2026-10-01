"use server";
/*
  파일명: actions/game/myth/getMythFigureLines.ts
  기능: 신화 게임 인물 대사 한 명분
  책임: 말을 건 인물 한 명의 고유 대사를 요청 언어로 돌려준다. 915명 전원의 대사를 한 번에 싣지 않으려고
        화면이 필요할 때 한 명씩 부른다. 연결값이 없으면(표본 모드) null — 화면은 범용 대사로 메운다.
*/ // ------------------------------
import { unstable_cache } from "next/cache";
import { getLocale } from "next-intl/server";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { createStaticClient } from "@/lib/db/static";
import { MYTH_LINE_SITUATIONS, type MythLines } from "@/components/features/game/myth/shared/types";
import { isMythFixtureMode } from "@/components/features/game/myth/shared/fixture";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface DialogueRow {
  lines: Record<string, unknown> | null;
  lines_en: Record<string, unknown> | null;
}

const texts = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];

async function fetchLines(celebId: string, locale: string): Promise<MythLines | null> {
  const { data, error } = await createStaticClient()
    .from("celeb_dialogues").select("lines,lines_en").eq("celeb_id", celebId).maybeSingle();
  if (error) throw new Error(`인물 대사 조회 실패: ${error.message}`);
  const row = data as DialogueRow | null;
  const source = locale === "en" ? row?.lines_en : row?.lines;
  if (!source) return null;
  const quote = typeof source.quote === "string" && source.quote.trim() ? source.quote.trim() : null;
  const lines = Object.fromEntries(MYTH_LINE_SITUATIONS.map((key) => [key, texts(source[key])])) as MythLines["lines"];
  return { quote, lines };
}

const getCachedLines = unstable_cache(fetchLines, ["myth-figure-lines-v1"], {
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.DIALOGUES],
});

export async function getMythFigureLines(celebId: string): Promise<MythLines | null> {
  if (!UUID.test(celebId) || isMythFixtureMode()) return null;
  const locale = (await getLocale()) === "en" ? "en" : "ko";
  try {
    return await getCachedLines(celebId, locale);
  } catch (error) {
    // 대사는 곁들이는 값이다 — 실패를 기록하고 화면은 범용 대사로 이어 간다
    console.error("[myth-game] 인물 대사 조회 실패:", error);
    return null;
  }
}
