/*
  파일명: /components/features/faction/atlas/FactionAtlasNav.tsx
  기능: 세력도감 선택기 — 섹션 줄·테마 줄·진영 줄
  책임: 신화 탐색과 같은 공용 선택기(AtlasNav)에 세 줄을 넘긴다. 섹션(알약)·테마(네모)는 주소 이동이고,
        진영(밑줄 탭)은 같은 화면 안의 선택이다(FactionGroupContext). 진영 줄에 「전체」는 없고 첫 진영이 기본이다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import AtlasNav, { type AtlasNavRow } from "@/components/shared/AtlasNav";
import { useFactionGroup, type FactionGroupMeta } from "./FactionGroupContext";

interface FactionAtlasNavProps {
  sections: {
    key: string;
    name: string;
    themes: { slug: string; name: string; count: number }[];
  }[];
  activeSectionKey: string;
  activeThemeSlug: string;
  /** 고른 테마의 진영 — 진영이 하나뿐인 테마면 비워 줄을 세우지 않는다 */
  groups?: FactionGroupMeta[];
}

export default function FactionAtlasNav({ sections, activeSectionKey, activeThemeSlug, groups = [] }: FactionAtlasNavProps) {
  const t = useTranslations("explore.faction");
  const { groupKey, setGroupKey } = useFactionGroup();
  const activeSection = sections.find((section) => section.key === activeSectionKey) ?? sections[0];

  const rows: AtlasNavRow[] = [
    {
      id: "sections",
      label: t("sectionNav"),
      shape: "pill",
      activeId: activeSection?.key ?? null,
      items: sections.map((section) => ({ id: section.key, name: section.name, href: `/explore/faction?section=${section.key}` })),
    },
    {
      id: "themes",
      label: t("themeNav"),
      shape: "square",
      activeId: activeThemeSlug,
      items: (activeSection?.themes ?? []).map((theme) => ({
        id: theme.slug,
        name: theme.name,
        count: theme.count,
        href: `/explore/faction/${theme.slug}`,
      })),
    },
  ];
  if (groups.length > 0) {
    rows.push({
      id: "groups",
      label: t("clusterLabel"),
      shape: "tab",
      wide: true,
      activeId: groupKey,
      items: groups.map((group) => ({ id: group.key, name: group.label ?? t("clusterOthers"), count: group.count })),
      onSelect: setGroupKey,
    });
  }

  return <AtlasNav rows={rows} />;
}
