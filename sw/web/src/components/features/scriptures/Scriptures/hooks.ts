/*
  파일명: /components/features/scriptures/Scriptures/hooks.ts
  기능: Scriptures 전용 커스텀 훅
  책임: IntersectionObserver, 스크롤 스파이
*/ // ------------------------------

import { useState, useEffect, useRef } from "react";

// #region useIntersectionObserver Hook
export function useIntersectionObserver(callback: () => void, options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const hasTriggered = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || hasTriggered.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasTriggered.current) {
          hasTriggered.current = true;
          callback();
          observer.disconnect();
        }
      },
      { rootMargin: "200px", ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [callback, options]);

  return ref;
}
// #endregion

// #region useActiveSection Hook - 스크롤 스파이
export function useActiveSection(sectionIds: string[]) {
  const [activeSection, setActiveSection] = useState(sectionIds[0]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setActiveSection(id);
          }
        },
        { rootMargin: "-20% 0px -70% 0px" }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [sectionIds]);

  return activeSection;
}
// #endregion
