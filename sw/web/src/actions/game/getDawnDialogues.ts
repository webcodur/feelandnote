/*
  파일명: actions/game/getDawnDialogues.ts
  기능: 여명 게임용 대사 데이터 배치 조회
  책임: 셀럽 ID 목록으로 speech_tone + celeb_dialogues를 일괄 조회한다.
*/
"use server";

import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/static";
import { getLocale } from "next-intl/server";

export interface DawnDialogueData {
  speechTone: string;
  dialogueLines: Record<string, string[]> | null;
  quote: string;
}

// lines JSONB 구조 — 상황 키는 변형 배열, quote 키만 단일 문자열
type DawnLines = Record<string, string[]> & { quote?: string | null };

// celeb_dialogues 조회 행
interface DawnDialogueRow {
  celeb_id: string;
  lines: DawnLines;
  lines_en: DawnLines | null;
}

async function fetchDawnDialogues(
  celebIdsKey: string,
  locale: string,
): Promise<Record<string, DawnDialogueData>> {
  const celebIds = celebIdsKey ? celebIdsKey.split(",") : [];
  if (celebIds.length === 0) return {};

  const supabase = createStaticClient();

  const [tonesResult, dialoguesResult] = await Promise.all([
    supabase.from("profiles").select("id, speech_tone").in("id", celebIds),
    supabase.from("celeb_dialogues").select("celeb_id, lines, lines_en").in("celeb_id", celebIds),
  ]);

  if (tonesResult.error) console.error("[getDawnDialogues] tone 조회 실패:", tonesResult.error.message);
  if (dialoguesResult.error) console.error("[getDawnDialogues] dialogue 조회 실패:", dialoguesResult.error.message);

  const toneMap = new Map<string, string>((tonesResult.data ?? []).map((t) => [t.id, t.speech_tone as string]));

  const dialogueMap = new Map<string, DawnLines>();
  const quoteMap = new Map<string, string>();
  const dialogueRows: DawnDialogueRow[] = dialoguesResult.data ?? [];
  for (const d of dialogueRows) {
    const lines = (locale === "en" && d.lines_en) ? d.lines_en : d.lines;
    dialogueMap.set(d.celeb_id, lines);
    const quote = lines?.quote ?? "";
    quoteMap.set(d.celeb_id, quote);
  }

  const result: Record<string, DawnDialogueData> = {};
  for (const id of celebIds) {
    result[id] = {
      speechTone: toneMap.get(id) ?? "composed",
      dialogueLines: dialogueMap.get(id) ?? null,
      quote: quoteMap.get(id) ?? "",
    };
  }
  return result;
}

const getDawnDialoguesCached = unstable_cache(
  fetchDawnDialogues,
  ["dawn-dialogues"],
  { revalidate: 3600, tags: ["celebs"] }
);

export async function getDawnDialogues(
  celebIds: string[]
): Promise<Record<string, DawnDialogueData>> {
  if (celebIds.length === 0) return {};
  const locale = await getLocale();
  // 정렬한 join을 키로 — 같은 조합이면 캐시 히트
  const key = [...celebIds].sort().join(",");
  return getDawnDialoguesCached(key, locale);
}
