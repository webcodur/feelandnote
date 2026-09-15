/*
  파일명: /components/features/faction/atlas/FactionGroupIntro.tsx
  기능: 고른 진영의 설명 판
  책임: 테마 설명 바로 아래에서, 칩 상자에서 고른 진영이 누구이고 무엇을 했는지 보여 준다. 「전체」거나 설명이 없으면 그리지 않는다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import { useFactionGroup, type FactionGroupMeta } from "./FactionGroupContext";

export default function FactionGroupIntro({ groups }: { groups: FactionGroupMeta[] }) {
  const t = useTranslations("explore.faction");
  const { groupKey } = useFactionGroup();
  const group = groups.find((item) => item.key === groupKey);
  if (!group?.description) return null;

  const name = group.label ?? t("clusterOthers");
  return (
    <section aria-label={name} className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 md:px-5">
      {/* 제목은 가운데 — 인원 수는 제목 오른쪽에 떠 있어 가운데 맞춤에 끼어들지 않는다 */}
      <div className="px-12 text-center">
        <h3 className="relative inline-block text-balance font-serif text-lg font-bold text-text-primary md:text-xl">
          {name}
          <span className="absolute start-full bottom-0.5 ms-2 whitespace-nowrap font-sans text-xs font-medium tabular-nums text-text-tertiary">
            {t("figureCount", { count: group.count })}
          </span>
        </h3>
      </div>
      <p className="mt-2 break-keep text-sm leading-7 text-text-secondary md:text-[15px]">{group.description}</p>
    </section>
  );
}
