"use client";

import { useEffect } from "react";
import { FACTION_LAST_COOKIE, FACTION_LAST_COOKIE_MAX_AGE } from "@/lib/faction-sections";

/** 테마 주소(/explore/faction/<slug>)를 열 때 마지막 세력을 쿠키에 적는다 — 허브 첫 항목 노출로 덮어쓰지 않게 주소에서만 쓴다 */
export default function FactionLastSeen({ slug }: { slug: string }) {
  useEffect(() => {
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${FACTION_LAST_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=${FACTION_LAST_COOKIE_MAX_AGE}; samesite=lax${secure}`;
  }, [slug]);
  return null;
}
