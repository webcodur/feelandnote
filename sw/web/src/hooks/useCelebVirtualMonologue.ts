"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { getCelebVirtualMonologue } from "@/actions/celebs/getCelebVirtualMonologue";

/*
  인물 한 명의 가상독백을 화면 언어로 받아 둔다.
  undefined = 아직 받는 중, null = 독백 없음(또는 조회 실패 — 이때 「가상독백」 단추가 안 뜰 뿐 화면은 그대로다).
  받은 값에 인물·언어 키를 붙여 두어, 인물이 바뀌면 이전 인물의 글이 잠깐 보이지 않는다.
*/
export function useCelebVirtualMonologue(celebId: string): string | null | undefined {
  const locale = useLocale();
  const key = `${celebId}:${locale}`;
  const [loaded, setLoaded] = useState<{ key: string; text: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    getCelebVirtualMonologue(celebId, locale)
      .then((text) => alive && setLoaded({ key, text }))
      .catch((error) => {
        console.error("[useCelebVirtualMonologue] 가상독백 조회 실패:", error);
        if (alive) setLoaded({ key, text: null });
      });
    return () => {
      alive = false;
    };
  }, [celebId, locale, key]);

  return loaded?.key === key ? loaded.text : undefined;
}
