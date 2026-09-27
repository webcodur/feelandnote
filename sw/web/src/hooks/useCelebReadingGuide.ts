"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { getCelebReadingGuide } from "@/actions/celebs/getCelebReadingGuide";
import type { Locale } from "@/types/locale";

export interface CelebReadingGuide {
  text: string;
  /** 본문이 실제로 쓰인 언어 — 영문이 비면 한국어 원문이 오므로 낭독 음원도 이 언어를 따라야 한다 */
  locale: Locale;
}

/*
  인물 한 명의 인물 안내를 화면 언어로 받아 둔다.
  undefined = 아직 받는 중, null = 안내 없음(또는 조회 실패).
  받은 값에 인물·언어 키를 붙여 두어, 인물이 바뀌면 이전 인물의 글이 잠깐 보이지 않는다.
*/
export function useCelebReadingGuide(celebId: string): CelebReadingGuide | null | undefined {
  const locale = useLocale();
  const key = `${celebId}:${locale}`;
  const [loaded, setLoaded] = useState<{ key: string; value: CelebReadingGuide | null } | null>(null);

  useEffect(() => {
    let alive = true;
    getCelebReadingGuide(celebId, locale)
      .then((value) => alive && setLoaded({ key, value }))
      .catch((error) => {
        console.error("[useCelebReadingGuide] 인물 안내 조회 실패:", error);
        if (alive) setLoaded({ key, value: null });
      });
    return () => {
      alive = false;
    };
  }, [celebId, locale, key]);

  return loaded?.key === key ? loaded.value : undefined;
}
