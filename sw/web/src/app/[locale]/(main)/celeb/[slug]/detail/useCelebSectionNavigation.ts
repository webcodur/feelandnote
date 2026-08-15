"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics/track";

import type { ServiceTarget } from "../celebServiceItems";

const NAVIGATION_RELEASE_MS = 1200;

export function navigateToCelebSection(target: ServiceTarget) {
  trackEvent("celeb_guide_click", { section: target.sectionId });
  window.history.replaceState(null, "", `#${target.sectionId}`);
  window.requestAnimationFrame(() => {
    const section = document.getElementById(target.sectionId);
    if (!section) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    /* "auto"는 html의 scroll-behavior: smooth를 따라가므로 움직임 최소화가 먹지 않는다 */
    section.scrollIntoView({
      behavior: reduceMotion ? "instant" : "smooth",
      block: "start",
    });
    section.focus({ preventScroll: true });
  });
}

export function useCelebSectionNavigation(sectionIds: string[]) {
  const sectionKey = sectionIds.join("|");
  const [activeSectionId, setActiveSectionId] = useState("introduction");
  const navTargetRef = useRef<string | null>(null);
  const navReleaseRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const sections = sectionKey
      .split("|")
      .filter(Boolean)
      .map((sectionId) => document.getElementById(sectionId))
      .filter((section): section is HTMLElement => section !== null);
    if (sections.length === 0) return;

    // IntersectionObserver는 이번에 상태가 바뀐 요소만 주므로 현재 화면에
    // 걸쳐 있는 구획을 따로 모아 기준선에 가장 가까운 구획을 고른다.
    const onScreen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onScreen.add(entry.target.id);
          else onScreen.delete(entry.target.id);
        }

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

        if (!nearestId) return;

        // 목차 이동 중 지나치는 구획이 차례로 활성화되는 현상을 막는다.
        if (navTargetRef.current) {
          if (nearestId === navTargetRef.current) navTargetRef.current = null;
          return;
        }

        setActiveSectionId(nearestId);
      },
      {
        rootMargin: "-18% 0px -68% 0px",
        threshold: 0.01,
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [sectionKey]);

  useEffect(
    () => () => window.clearTimeout(navReleaseRef.current),
    [],
  );

  const navigate = useCallback((target: ServiceTarget) => {
    navTargetRef.current = target.sectionId;

    window.clearTimeout(navReleaseRef.current);
    navReleaseRef.current = window.setTimeout(() => {
      navTargetRef.current = null;
    }, NAVIGATION_RELEASE_MS);

    setActiveSectionId(target.sectionId);
    navigateToCelebSection(target);
  }, []);

  return { activeSectionId, navigate };
}
