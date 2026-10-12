"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { scrollToSection } from "./sectionNavigation";

// 모달 본문의 바로 바깥 스크롤 상자만 추적한다. 배경 페이지의 주소·스크롤은 건드리지 않는다.
export function useContainerSectionNavigation(sectionIds: string[], contentRef: RefObject<HTMLElement | null>) {
  const sectionKey = sectionIds.join("|");
  const [activeSectionId, setActiveSectionId] = useState(sectionIds[0] ?? "");
  const targetRef = useRef<string | null>(null);
  const releaseRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const content = contentRef.current;
    const container = content?.parentElement;
    if (!content || !container) return;
    const ids = sectionKey.split("|").filter(Boolean);

    const update = () => {
      if (targetRef.current) return;
      const atBottom = container.scrollHeight > container.clientHeight + 1
        && container.scrollTop + container.clientHeight >= container.scrollHeight - 24;
      if (atBottom) {
        setActiveSectionId(ids[ids.length - 1] ?? "");
        return;
      }
      const anchor = container.getBoundingClientRect().top + container.clientHeight * 0.24;
      let current = ids[0] ?? "";
      for (const id of ids) {
        const section = document.getElementById(id);
        if (section && content.contains(section) && section.getBoundingClientRect().top <= anchor) current = id;
      }
      setActiveSectionId(current);
    };

    update();
    container.addEventListener("scroll", update, { passive: true });
    container.addEventListener("scrollend", update);
    const observer = new ResizeObserver(update);
    observer.observe(content);
    observer.observe(container);
    return () => {
      observer.disconnect();
      container.removeEventListener("scroll", update);
      container.removeEventListener("scrollend", update);
      clearTimeout(releaseRef.current);
    };
  }, [contentRef, sectionKey]);

  const navigate = useCallback((sectionId: string) => {
    const content = contentRef.current;
    const container = content?.parentElement;
    const section = document.getElementById(sectionId);
    if (!container || !section || !content?.contains(section)) return;
    targetRef.current = sectionId;
    clearTimeout(releaseRef.current);
    setActiveSectionId(sectionId);
    releaseRef.current = setTimeout(() => { targetRef.current = null; }, 1200);
    requestAnimationFrame(() => scrollToSection(section, container));
  }, [contentRef]);

  return { activeSectionId, navigate };
}
