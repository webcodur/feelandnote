/*
  파일명: /components/ui/pending/useNearViewport.ts
  기능: 대상이 화면 근처까지 올라왔는지 한 번만 알린다
  책임: 첫 화면 밖 구획을 스크롤이 다가올 때 비로소 불러오게 한다.
        한 번 참이 되면 다시 거짓으로 돌아가지 않는다. 관찰 기능이 없는 환경에서는 즉시 참이다.
*/ // ------------------------------

"use client";

import { useEffect, useRef, useState } from "react";

export function useNearViewport(rootMargin = "600px 0px") {
  const ref = useRef<HTMLDivElement>(null);
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    if (isNear) return;

    const target = ref.current;
    if (!target) return;

    // 관찰 기능이 없으면 기다리지 않고 바로 보여준다 — 안 보이는 것보다 낫다
    if (typeof IntersectionObserver === "undefined") {
      const timer = setTimeout(() => setIsNear(true), 0);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        setIsNear(true);
        observer.disconnect();
      },
      { rootMargin },
    );
    observer.observe(target);

    return () => observer.disconnect();
  }, [isNear, rootMargin]);

  return { ref, isNear };
}
