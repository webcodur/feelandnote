/* ─────────────────────────────────────────────
 * 구획 스크롤 이동·현재 구획 추적 — 공용 (아틀라스 목차 엔진)
 * - 목차 위치: 공용 (shared/atlasNav과 짝)
 * - 데이터: sectionIds props, IntersectionObserver
 * - 함께 보기: components/shared/atlasNav/AtlasNav.tsx, scrollToSection
 * ───────────────────────────────────────────── */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { scrollToSection } from "./sectionNavigation";

const NAVIGATION_RELEASE_MS = 1200;

const sectionIdList = (sectionKey: string) =>
  sectionKey.split("|").filter(Boolean);

/** 주소줄에 구획을 새기고 그 머리로 이동한다. */
export function navigateToSection(sectionId: string) {
  window.history.replaceState(null, "", `#${sectionId}`);
  window.requestAnimationFrame(() => {
    const section = document.getElementById(sectionId);
    if (!section) return;

    scrollToSection(section);
  });
}

export function useSectionNavigation(sectionIds: string[]) {
  const sectionKey = sectionIds.join("|");
  const [activeSectionId, setActiveSectionId] = useState(sectionIds[0] ?? "");
  const navTargetRef = useRef<string | null>(null);
  const navReleaseRef = useRef<number | undefined>(undefined);

  // 짧은 마지막 구획은 감지 기준선에 닿지 못한다. 페이지 끝에서는
  // 스크롤 이벤트와 관측 콜백 모두 마지막 구획을 우선해 선택한다.
  const syncPageBottom = useCallback(() => {
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 24;
    if (!atBottom) return false;
    const lastId = sectionIdList(sectionKey).reverse().find(id => document.getElementById(id));
    if (!lastId) return false;
    navTargetRef.current = null;
    window.clearTimeout(navReleaseRef.current);
    setActiveSectionId(lastId);
    return true;
  }, [sectionKey]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    // IntersectionObserver는 이번에 상태가 바뀐 요소만 주므로 현재 화면에
    // 걸쳐 있는 구획을 따로 모아 기준선에 가장 가까운 구획을 고른다.
    const onScreen = new Set<string>();
    const updateActiveSection = () => {
      if (syncPageBottom()) return;

      const anchor = window.innerHeight * 0.24;
      let nearestId: string | null = null;
      let nearestGap = Infinity;

      for (const sectionId of onScreen) {
        const section = document.getElementById(sectionId);
        if (!section) continue;

        const gap = Math.abs(section.getBoundingClientRect().top - anchor);
        if (gap < nearestGap) {
          nearestGap = gap;
          nearestId = sectionId;
        }
      }

      // 목차 이동 중 지나치는 구획이 차례로 활성화되는 현상을 막는다.
      if (navTargetRef.current) {
        if (nearestId === navTargetRef.current) navTargetRef.current = null;
        return;
      }

      if (!nearestId) return;
      setActiveSectionId(nearestId);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onScreen.add(entry.target.id);
          else onScreen.delete(entry.target.id);
        }
        updateActiveSection();
      },
      {
        rootMargin: "-18% 0px -68% 0px",
        threshold: 0.01,
      },
    );

    /* 구획은 스트리밍(Lane)으로 늦게 뜨거나 자료 없음으로 빠졌다 들어온다 —
       DOM이 바뀌면 관측 대상을 다시 맞춘다 */
    let observedKey = "";
    const attach = () => {
      const ids = sectionIdList(sectionKey);
      const sections = ids
        .map((sectionId) => document.getElementById(sectionId))
        .filter((section): section is HTMLElement => section !== null);
      const foundKey = sections.map((section) => section.id).join("|");
      if (foundKey === observedKey) return;
      observedKey = foundKey;
      onScreen.clear();
      observer.disconnect();
      sections.forEach((section) => observer.observe(section));
    };

    attach();
    const mutations = new MutationObserver(attach);
    mutations.observe(document.body, { childList: true, subtree: true });

    // 하단에서 위로 돌아와도 같은 구획이 감지 띠에 남으면 관측 콜백은 오지 않는다.
    // 스크롤에서도 다시 계산하되 한 프레임에 한 번만 읽는다.
    let scrollFrame: number | undefined;
    const onScroll = () => {
      if (scrollFrame !== undefined) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = undefined;
        updateActiveSection();
      });
    };
    updateActiveSection();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(scrollFrame ?? 0);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      observer.disconnect();
      mutations.disconnect();
    };
  }, [sectionKey, syncPageBottom]);

  useEffect(
    () => () => {
      window.clearTimeout(navReleaseRef.current);
    },
    [],
  );

  const navigate = useCallback((sectionId: string) => {
    navTargetRef.current = sectionId;

    window.clearTimeout(navReleaseRef.current);
    navReleaseRef.current = window.setTimeout(() => {
      navTargetRef.current = null;
    }, NAVIGATION_RELEASE_MS);

    setActiveSectionId(sectionId);
    navigateToSection(sectionId);
  }, []);

  return { activeSectionId, navigate };
}
