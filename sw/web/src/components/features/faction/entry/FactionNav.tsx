/*
  파일명: /components/features/faction/entry/FactionNav.tsx
  기능: 세력도감 선택기 — 섹션 줄·테마 줄·진영 줄
  책임: 신화 탐색과 같은 공용 선택기(ExploreNav)에 세 줄을 넘긴다. 섹션(알약)·테마(네모)는 주소 이동이고,
        진영(밑줄 탭)은 같은 화면 안의 선택이다(FactionGroupContext). 진영 줄에 「전체」는 없고 첫 진영이 기본이다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import ExploreNav, { type ExploreNavRow } from "@/components/shared/ExploreNav";
import { useFactionGroup, type FactionGroupMeta } from "./FactionGroupContext";

interface FactionNavProps {
  sections: {
    key: string;
    name: string;
    entries: { slug: string; name: string; count: number }[];
  }[];
  activeSectionKey: string;
  activeEntrySlug: string;
  /** 고른 테마의 진영 — 진영이 하나뿐인 테마면 비워 줄을 세우지 않는다 */
  groups?: FactionGroupMeta[];
}

export default function FactionNav({ sections, activeSectionKey, activeEntrySlug, groups = [] }: FactionNavProps) {
  const t = useTranslations("explore.faction");
  const { groupKey, setGroupKey } = useFactionGroup();
  const activeSection = sections.find((section) => section.key === activeSectionKey) ?? sections[0];

  const rows: ExploreNavRow[] = [
    {
      id: "sections",
      label: t("sectionNav"),
      shape: "pill",
      mobileArrows: true,
      activeId: activeSection?.key ?? null,
      items: sections.map((section) => ({ id: section.key, name: section.name, href: `/explore/faction?section=${section.key}` })),
    },
    {
      id: "entries",
      label: t("themeNav"),
      shape: "square",
      mobileArrows: true,
      activeId: activeEntrySlug,
      items: (activeSection?.entries ?? []).map((entry) => ({
        id: entry.slug,
        name: entry.name,
        count: entry.count,
        href: `/explore/faction/${entry.slug}`,
      })),
    },
  ];
  if (groups.length > 0) {
    rows.push({
      id: "groups",
      label: t("clusterLabel"),
      shape: "tab",
      wide: true,
      mobileArrows: true,
      activeId: groupKey,
      items: groups.map((group) => ({ id: group.key, name: group.label ?? t("clusterOthers"), count: group.count })),
      onSelect: setGroupKey,
    });
  }

  return <ExploreNav rows={rows} />;
}
