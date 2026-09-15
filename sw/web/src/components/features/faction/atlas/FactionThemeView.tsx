/*
  파일명: /components/features/faction/atlas/FactionThemeView.tsx
  기능: 세력도감 테마 본문
  책임: 칩 상자에서 고른 진영(FactionGroupContext)의 인물을 정렬해 카드 격자로 보여 주고,
        카드를 누르면 세력도감 인물 소개 모달(FactionMemberModal)을 띄운다.
*/ // ------------------------------

"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CelebGrid } from "@/components/features/home/CelebCarousel";
import { cn } from "@/lib/utils";
import type { CelebProfile } from "@/types/home";
import { useFactionGroup } from "./FactionGroupContext";
import FactionMemberModal, { type FactionMemberMeta } from "./FactionMemberModal";

export interface FactionThemeCluster {
  /** 칩 상자의 진영 key와 같다 */
  key: string;
  celebs: CelebProfile[];
}

interface FactionThemeViewProps {
  tagId: string;
  /** 화면 언어의 테마 이름 — 모달 머리에 쓴다 */
  themeName: string;
  /** 테마 전원 — 명단 차례대로 */
  celebs: CelebProfile[];
  /** 진영별 인물 */
  clusters: FactionThemeCluster[];
  /** 인물 id → 이 테마 안에서의 역할·진영·개인 화보 */
  members: Record<string, FactionMemberMeta>;
}

const SORTS = ["order", "influence", "name", "birth"] as const;
type SortKey = (typeof SORTS)[number];

/** 출생 연도 — 기원전은 음수로 온다("-0551-09-28"). 모르면 맨 뒤 */
function birthYear(celeb: CelebProfile) {
  const year = parseInt(celeb.birth_date ?? "", 10);
  return Number.isNaN(year) ? Number.MAX_SAFE_INTEGER : year;
}

function sortCelebs(celebs: CelebProfile[], sort: SortKey, locale: string) {
  if (sort === "order") return celebs;
  const displayName = (celeb: CelebProfile) => (locale === "en" && celeb.nickname_en) || celeb.nickname;
  return [...celebs].sort((a, b) => {
    if (sort === "influence") return (b.influence?.total_score ?? -1) - (a.influence?.total_score ?? -1);
    if (sort === "name") return displayName(a).localeCompare(displayName(b), locale);
    return birthYear(a) - birthYear(b);
  });
}

const toggleClass = (active: boolean) =>
  cn(
    "inline-flex min-h-9 items-center gap-1.5 rounded px-3 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent",
    active ? "bg-accent/10 text-accent hover:bg-accent/20" : "text-text-secondary hover:bg-white/5 hover:text-text-primary",
  );

export default function FactionThemeView({ tagId, themeName, celebs, clusters, members }: FactionThemeViewProps) {
  const t = useTranslations("explore.faction");
  const locale = useLocale();
  const { groupKey } = useFactionGroup();
  const [sort, setSort] = useState<SortKey>("order");
  const [openId, setOpenId] = useState<string | null>(null);

  const selected = clusters.find((cluster) => cluster.key === groupKey) ?? null;
  const shown = useMemo(
    () => sortCelebs(selected ? selected.celebs : celebs, sort, locale),
    [selected, celebs, sort, locale],
  );
  const openCeleb = openId ? celebs.find((celeb) => celeb.id === openId) : undefined;

  return (
    <div>
      <div role="group" aria-label={t("sortLabel")} className="mb-5 flex flex-wrap items-center justify-end gap-1">
        {SORTS.map((key) => (
          <button key={key} type="button" aria-pressed={sort === key} onClick={() => setSort(key)} className={toggleClass(sort === key)}>
            {t(`sort.${key}`)}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-secondary">{t("empty")}</p>
      ) : (
        <CelebGrid celebs={shown} isLoading={false} quiet onSelect={setOpenId} />
      )}

      {openCeleb && (
        <FactionMemberModal
          key={openCeleb.id}
          tagId={tagId}
          themeName={themeName}
          celeb={openCeleb}
          meta={members[openCeleb.id]}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
