/*
  파일명: hooks/usePreloadImages.ts
  기능: 이미지 URL 목록을 브라우저 캐시에 프리로드
  책임: 마운트 시 Image 객체로 즉시 다운로드를 시작하여
        이후 실제 렌더링 시 캐시 히트를 보장한다.
*/

import { useEffect, useRef } from "react";

export function usePreloadImages(urls: string[]) {
  const loadedRef = useRef(new Set<string>());

  useEffect(() => {
    for (const url of urls) {
      if (!url || loadedRef.current.has(url)) continue;
      loadedRef.current.add(url);
      const img = new Image();
      img.src = url;
    }
  }, [urls]);
}
