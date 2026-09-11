/*
  파일명: /hooks/useClippedText.ts
  기능: 접힌 본문이나 스크롤 상자의 글이 아래로 더 남았는지 잰다.
  책임: 「더 보기」 단추와 끝 흐림(clip-fade-end)은 글이 정말 넘칠 때만 붙인다.
        스크롤 상자는 끝까지 내리면 남은 글이 없으므로 흐림을 걷는다. overflow-hidden 상자는 scrollTop이 0이라 같은 식이 맞는다.
        글이 짧아 다 보이는데 단추가 있으면 눌러도 아무 변화가 없다.
        글꼴이 늦게 오거나 창 폭이 바뀌면 넘침 여부가 달라지므로 ResizeObserver로 다시 잰다.

  「화면이 허락하는 만큼 보여 주기」 조합 — 줄 수를 미리 박지 않는다.
  - 칸: 이웃 열이 정한 높이를 받는다. 칸이 제 높이를 내지 않게 contain-size를 주거나(ExpandCard),
        높이를 인라인으로 박는 래퍼(AnimatedHeight) 안이면 그 바깥 상자를 lg:contents로 지우고
        안쪽을 부모 flex에 직접 넣는다(FigureBookFeature).
  - 본문: flex-1 overflow-hidden. 바닥(최소 줄 수)은 본문의 min-h로 잡고, 본문이 행을 밀지 않게 contain-size를 준다.
  - 잘림 표시: isClipped일 때만 「더 보기」와 clip-fade-end. 기준 높이가 없는 좁은 폭은 line-clamp-N으로 접는다.
*/ // ------------------------------
"use client";

import { useEffect, useRef, useState } from "react";

/** enabled가 false인 동안(펼친 상태, 로딩 중, 닫힌 모달)은 재지 않고 직전 값을 둔다 */
export function useClippedText<T extends HTMLElement = HTMLDivElement>(
  text: string | null | undefined,
  enabled = true,
) {
  const ref = useRef<T>(null);
  const [isClipped, setIsClipped] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      setIsClipped(element.scrollTop + element.clientHeight < element.scrollHeight - 1);
    };
    const frame = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    // 상한에 닿은 상자는 안쪽이 자라도 제 크기가 안 변하므로 첫 자식도 본다
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    element.addEventListener("scroll", measure, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      element.removeEventListener("scroll", measure);
    };
  }, [text, enabled]);

  return { ref, isClipped };
}
