"use client";

import { useEffect } from "react";
import { applyTheme, readStoredTheme, subscribeTheme } from "@/lib/theme";

/**
 * 머리 스크립트가 붙인 html[data-theme]는 React가 레이아웃을 브라우저에서 다시 그릴 때
 * (404·오류 복구 등) 서버 값으로 지워진다. 마운트 때 저장된 테마를 다시 붙이고,
 * 다른 탭에서 바꾼 테마도 따라간다.
 */
export default function ThemeSync() {
  useEffect(() => {
    const sync = () => applyTheme(readStoredTheme());
    sync();
    return subscribeTheme(sync);
  }, []);
  return null;
}
