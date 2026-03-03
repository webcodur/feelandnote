/*
  파일명: actions/game/getDawnDialogues.ts
  기능: 여명 게임용 대사 데이터 배치 조회
  책임: 셀럽 ID 목록으로 speech_tone + celeb_dialogues를 일괄 조회한다.
*/
"use server";

import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";

export interface DawnDialogueData {
  speechTone: string;
  dialogueLines: Record<string, string[]> | null;
  quote: string;
}

export async function getDawnDialogues(
  celebIds: string[]
): Promise<Record<string, DawnDialogueData>> {
  if (celebIds.length === 0) return {};

  const supabase = await createClient();
  const locale = await getLocale();

  const [tonesResult, dialoguesResult, profilesResult] = await Promise.all([
    supabase.from("celeb_persona").select("celeb_id, speech_tone").in("celeb_id", celebIds),
    supabase.from("celeb_dialogues").select("celeb_id, lines, lines_en").in("celeb_id", celebIds),
    supabase.from("profiles").select("id, quotes, quotes_en").in("id", celebIds),
  ]);

  if (tonesResult.error) console.error("[getDawnDialogues] tone 조회 실패:", tonesResult.error.message);
  if (dialoguesResult.error) console.error("[getDawnDialogues] dialogue 조회 실패:", dialoguesResult.error.message);
  if (profilesResult.error) console.error("[getDawnDialogues] profile 조회 실패:", profilesResult.error.message);

  const tones = tonesResult.data;
  const dialogues = dialoguesResult.data;
  const profiles = profilesResult.data;

  const toneMap = new Map<string, string>((tones ?? []).map((t) => [t.celeb_id, (t as any).speech_tone as string]));
  const dialogueMap = new Map<string, any>((dialogues ?? []).map((d) => [d.celeb_id, (locale === 'en' && d.lines_en) ? d.lines_en : d.lines]));
  const quoteMap = new Map<string, string>((profiles ?? []).map((p) => [p.id, (locale === 'en' && (p as any).quotes_en) ? (p as any).quotes_en : p.quotes ?? ""]));

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
