/*
  파일명: /hooks/useMediaQuery.ts
  기능: 미디어 쿼리 일치 여부 구독
  책임: 창 폭이 바뀌면 다시 그린다. 서버와 첫 하이드레이션은 false로 맞춰 불일치를 만들지 않는다.
        화면에 보일지 말지는 CSS로 가르고, 이 훅은 포털 자리 등록처럼 CSS로 못 하는 일에만 쓴다.
*/ // ------------------------------

import { useCallback, useSyncExternalStore } from "react";

export default function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
