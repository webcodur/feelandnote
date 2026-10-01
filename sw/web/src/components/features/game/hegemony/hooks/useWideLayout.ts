/*
  파일명: components/features/game/hegemony/hooks/useWideLayout.ts
  기능: 화면 폭 구간 여부
  책임: lg(1024px)·md(768px) 이상인지 알려 준다. 같은 인물이 두 배치에 동시에 그려지면 날아가는 연출이 엉키므로,
        CSS로 숨기는 대신 한쪽만 그리도록 화면이 이 값을 쓴다. 서버는 넓은 화면으로 그린다.
*/
"use client";
import { useSyncExternalStore } from "react";
const WIDE = "(min-width: 1024px)";
const TABLET = "(min-width: 768px)";
function subscribeTo(query: string) {
  return (onChange: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  };
}
const subscribeWide = subscribeTo(WIDE);
const subscribeTablet = subscribeTo(TABLET);
/** lg 이상: 대전·선발 화면을 넓은 배치로 그린다 */
export function useWideLayout(): boolean {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => true);
}
/** md 이상: 휴대폰용 아래 음악 줄 없이 떠 있는 사이트 음악 단추만 쓴다 */
export function useTabletUp(): boolean {
  return useSyncExternalStore(subscribeTablet, () => window.matchMedia(TABLET).matches, () => true);
}
