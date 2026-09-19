"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CategoryTabFilter, type CategoryTabOption } from "@/components/ui/CategoryTabFilter";
import { HubMoreLink } from "@/components/shared/HubSection";
import type { BestsellerItem, LibraryContent } from "@/actions/library/types";
import BestsellerFreshness, { type BestsellerFreshnessProps } from "../BestsellerFreshness";
import BookChartGrid from "../BookChartGrid";
import ClassicsGrid from "../ClassicsGrid";

type Mode = "bestseller" | "classics";

export default function PopularPreview({
  items,
  restCount,
  classics,
  classicsRestCount,
  ...freshness
}: {
  items: BestsellerItem[];
  restCount: number;
  classics: LibraryContent[];
  classicsRestCount: number;
} & BestsellerFreshnessProps) {
  const t = useTranslations("library.popular");
  const tHub = useTranslations("library.hub");
  const [mode, setMode] = useState<Mode>("bestseller");

  // 안쪽 인기 작품 화면과 같은 1단 모드 pill — 허브에서도 두 갈래를 바로 고른다
  const modeChips: CategoryTabOption[] = [
    { value: "bestseller", label: t("tabBestseller") },
    { value: "classics", label: t("tabClassics") },
  ];

  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        <CategoryTabFilter
          options={modeChips}
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          size="md"
        />
      </div>

      {mode === "bestseller" ? (
        items.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-secondary">{t("chartEmpty")}</p>
        ) : (
          <>
            {/* 차트 머리말 — 수수료 안내는 판매 단추 안에 묻지 않고 기준일 줄 옆에 둔다 */}
            <div className="flex items-center justify-center gap-2">
              <BestsellerFreshness {...freshness} />
            </div>
            <BookChartGrid items={items} />
            {/* 허브는 앞 순위 몇 권만 세운다 — 남은 권수를 알려 아래 「더 보기」로 잇는다 */}
            {restCount > 0 && (
              <p className="text-center text-xs text-text-tertiary md:text-[13px]">
                {t("previewRest", { count: restCount })}
              </p>
            )}
          </>
        )
      ) : classics.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-secondary">{t("empty")}</p>
      ) : (
        <>
          <ClassicsGrid contents={classics} />
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-text-tertiary md:text-[13px]">
            {classicsRestCount > 0 && t("previewRestClassics", { count: classicsRestCount })}
          </p>
        </>
      )}

      {/* 더 보기 — 보고 있는 모드 그대로 안쪽 화면으로 잇는다 */}
      <HubMoreLink
        href={mode === "classics" ? "/library/popular?mode=classics" : "/library/popular"}
        label={tHub("moreDetail")}
      />
    </div>
  );
}
