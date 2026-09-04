/* ─────────────────────────────────────────────
 * [celeb 상세] 머리말 — 실존/가상 뱃지
 * - 목차 위치: 머리말 (introduction)
 * - 데이터: reality prop(celeb_reality: REAL/BOTH/FICTION)
 * - 함께 보기: detail/hero/HeroIdentity.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useTranslations } from "next-intl";
import { Landmark, Sparkles } from "lucide-react";
import type { CelebReality } from "@feelandnote/shared/constants/celeb-tiers";

export function CelebTierBadge({ reality }: { reality?: CelebReality | null }) {
  const t = useTranslations("celebPage");
  if (!reality || reality === "REAL") return null;

  return (
    <>
      {(reality === "BOTH") ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-accent-dim/30 bg-accent-dim/10 px-3 py-1.5 align-middle text-base font-medium leading-tight text-text-secondary sm:text-lg">
          <Landmark className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" />
          {t("realityRealBadge")}
        </span>
      ) : null}
      <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 align-middle text-base font-medium leading-tight text-accent/90 sm:text-lg">
        <Sparkles className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" />
        {t("tierFictionBadge")}
      </span>
    </>
  );
}
