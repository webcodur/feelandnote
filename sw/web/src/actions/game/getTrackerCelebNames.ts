/*
  파일명: actions/game/getTrackerCelebNames.ts
  기능: 인물추적 게임 자동완성용 셀럽 닉네임 목록
  책임: 퍼블릭 도메인 셀럽의 id + nickname을 반환한다
*/
"use server";

import { createClient } from "@/lib/supabase/server";

export interface TrackerCelebName {
  id: string;
  nickname: string;
}

export async function getTrackerCelebNames(): Promise<TrackerCelebName[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, nickname, death_date")
    .eq("profile_type", "CELEB")
    .eq("status", "active")
    .not("death_date", "is", null);

  if (!data) return [];

  // 퍼블릭 도메인 필터 (1920년 이전 사망)
  return data
    .filter((c) => {
      const d = c.death_date;
      if (!d || d === "") return false;
      if (d.startsWith("-")) return true;
      const match = d.match(/^(\d{1,4})/);
      return match ? parseInt(match[1], 10) <= 1920 : false;
    })
    .map((c) => ({ id: c.id, nickname: c.nickname }))
    .sort((a, b) => a.nickname.localeCompare(b.nickname, "ko"));
}
