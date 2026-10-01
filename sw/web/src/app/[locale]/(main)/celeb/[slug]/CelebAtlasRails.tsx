/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 구획 목차 포장
 * - 목차 위치: 공통 (옆 레일 + 하단 띠)
 * - 실체는 shared/atlasNav — 여기서는 인물 목차 항목과 묶음 구분만 맞춘다
 * - 함께 보기: celebServiceItems.ts, detail/CelebRecordSections.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useCallback } from "react";

import AtlasNav, { type AtlasNavItem } from "@/components/shared/atlasNav/AtlasNav";

import type { ServiceItem, ServiceTarget } from "./celebServiceItems";

const NAV_GROUP_START_KEYS = new Set([
  "connections",
  "analysis",
  "media",
  "guestbook",
  "relatedFigures",
]);

interface CelebAtlasNavProps {
  items: ServiceItem[];
  activeSectionId: string;
  onNavigate: (target: ServiceTarget) => void;
}

export function CelebAtlasNav({ items, activeSectionId, onNavigate }: CelebAtlasNavProps) {
  const go = useCallback(
    (sectionId: string) => onNavigate({ sectionId }),
    [onNavigate],
  );
  const atlasItems: AtlasNavItem[] = items.map((item) => ({
    key: item.key,
    chapter: item.chapter,
    label: item.label,
    sectionId: item.target.sectionId,
    groupStart: NAV_GROUP_START_KEYS.has(item.key),
  }));
  return <AtlasNav items={atlasItems} activeId={activeSectionId} onNavigate={go} />;
}
