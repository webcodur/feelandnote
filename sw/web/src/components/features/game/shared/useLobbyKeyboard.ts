/*
  파일명: components/features/game/shared/useLobbyKeyboard.ts
  기능: 로비 키보드 네비게이션 훅
  책임: ArrowUp/Down 포커스 이동, Enter/Space 선택, Escape 뒤로가기, 숫자키 빠른 선택.
        data-lobby-item 속성이 있는 활성 버튼을 탐색 대상으로 인식한다.
*/
"use client";

import { useEffect, useRef, useState } from "react";

const SELECTOR = "button[data-lobby-item]:not(:disabled)";

/**
 * 로비 키보드 네비게이션 (다수 항목 탐색용)
 * - ArrowUp/Down: 포커스 이동
 * - Enter/Space: 선택 (포커스된 항목이 있을 때)
 * - Escape: onEscape 콜백
 * - 숫자키 1~9: 해당 순번 항목 즉시 선택
 */
export function useLobbyKeyboard(onEscape?: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const escRef = useRef(onEscape);
  escRef.current = onEscape;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const items = ref.current?.querySelectorAll<HTMLElement>(SELECTOR);
      const n = items?.length ?? 0;

      switch (e.key) {
        case "ArrowDown":
          if (n > 1) { e.preventDefault(); setIdx(p => (p + 1) % n); }
          break;
        case "ArrowUp":
          if (n > 1) { e.preventDefault(); setIdx(p => (p <= 0 ? n - 1 : p - 1)); }
          break;
        case "Enter":
        case " ":
          if (idx >= 0 && idx < n) { e.preventDefault(); items![idx]?.click(); }
          break;
        case "Escape":
          escRef.current?.();
          break;
        default:
          if (e.key >= "1" && e.key <= "9" && n > 0) {
            const ni = parseInt(e.key) - 1;
            if (ni < n) items![ni]?.click();
          }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [idx]);

  // data-focused 속성 동기화 (포커스 시각 표시용)
  useEffect(() => {
    const items = ref.current?.querySelectorAll<HTMLElement>(SELECTOR);
    items?.forEach((el, i) => { el.dataset.focused = String(i === idx); });
  }, [idx]);

  return ref;
}

