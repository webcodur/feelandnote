/*
  파일명: components/features/game/hegemony/hooks/useHotkeys.ts
  기능: 단축키
  책임: 켜져 있는 동안 지정한 키에 동작을 붙인다. 입력칸에 쓰는 중이거나 조합키를 누르면 무시한다.
        Escape는 전체화면 나가기가 쓰므로 여기서 붙이지 않는다.
*/
"use client";

import { useEffect, useEffectEvent } from "react";

export type HotkeyMap = Partial<Record<string, () => void>>;

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

/** 한글 자판 상태에서도 Q·W·E·숫자가 먹도록 물리 키 위치(code)로 읽는다 */
function keyOf(event: KeyboardEvent): string {
  const { code } = event;
  if (code.startsWith("Key")) return code.slice(3).toLowerCase();
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad") && /\d$/.test(code)) return code.slice(-1);
  if (code === "Space") return " ";
  return event.key;
}

export function useHotkeys(map: HotkeyMap, enabled = true) {
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
    const handler = map[keyOf(event)];
    if (!handler) return;
    event.preventDefault();
    handler();
  });

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [enabled]);
}
