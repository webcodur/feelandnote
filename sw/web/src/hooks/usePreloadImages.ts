/*
  파일명: hooks/usePreloadImages.ts
  기능: 이미지 URL 목록을 브라우저 캐시에 프리로드
  책임: 지정한 사진만 낮은 우선순위로 미리 받는다.
        지난 사진의 파일은 HTTP 캐시에 맡기고 Image 객체를 무한히 보유하지 않는다.
*/

import { useEffect, useRef } from "react";

export function usePreloadImages(urls: string[]) {
  const imagesRef = useRef(new Map<string, HTMLImageElement>());

  useEffect(() => {
    const images = imagesRef.current;
    const wanted = new Set(urls);
    for (const [url, image] of images) {
      if (!wanted.has(url)) {
        image.onerror = null;
        images.delete(url);
      }
    }
    for (const url of urls) {
      if (!url || images.has(url)) continue;
      const img = new Image();
      img.decoding = "async";
      img.fetchPriority = "low";
      // 실패한 미리 읽기는 다시 방문했을 때 재시도할 수 있어야 한다.
      img.onerror = () => { if (images.get(url) === img) images.delete(url); };
      images.set(url, img);
      img.src = url;
    }
  }, [urls]);

  useEffect(() => {
    const images = imagesRef.current;
    return () => {
      for (const image of images.values()) image.onerror = null;
      images.clear();
    };
  }, []);
}
