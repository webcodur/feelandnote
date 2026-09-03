/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 구획 스크롤 이동·현재 구획 추적
 * - 목차 위치: 공통 (목차 내비게이션)
 * - 데이터: sectionIds props, IntersectionObserver
 * - 함께 보기: celebServiceItems.ts, detail/CelebRecordSections.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics/track";

import type { ServiceTarget } from "../celebServiceItems";

const NAVIGATION_RELEASE_MS = 1200;

const sectionIdList = (sectionKey: string) =>
  sectionKey.split("|").filter(Boolean);

export function navigateToCelebSection(target: ServiceTarget) {
  trackEvent("celeb_guide_click", { section: target.sectionId });
  window.history.replaceState(null, "", `#${target.sectionId}`);
  window.requestAnimationFrame(() => {
    const section = document.getElementById(target.sectionId);
    if (!section) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // 이동 중에도 구획 머리는 붙어 있는 채로 둔다. 잠시 흐름으로 되돌리면
    // 머리가 사라졌다가 튀어 돌아온다 — 구획끼리 빈틈 없이 이어지므로 겹치지도 않는다.
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

    const ids = sectionIdList(sectionKey);
    const sections = ids
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

        // 목차 이동 중 지나치는 구획이 차례로 활성화되는 현상을 막는다.
        if (navTargetRef.current) {
          if (nearestId === navTargetRef.current) navTargetRef.current = null;
          return;
        }

        if (!nearestId) return;
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

  // 페이지 끝에 닿으면 마지막 구획을 켠다. 짧은末 구획은 기준선을 스치지 않아
  // 관측 콜백이 안 불리므로 스크롤에서 직접 본다. 底 도착은 이동 완료로 쳐서
  // 가드를 풀어준다 — 안 그러면 가드가 풀린 뒤 관측이 위로 튕겨올린다.
  useEffect(() => {
    const onScroll = () => {
      const ids = sectionIdList(sectionKey);
      if (ids.length === 0) return;
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 24;
      if (!atBottom) return;
      navTargetRef.current = null;
      window.clearTimeout(navReleaseRef.current);
      setActiveSectionId(ids[ids.length - 1]);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
