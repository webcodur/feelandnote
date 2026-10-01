/* ─────────────────────────────────────────────
 * [celeb 상세] 머리말 — 실존여부 칩
 * - 목차 위치: 머리말 (introduction)
 * - 데이터: reality prop(celeb_reality: REAL/BOTH/FICTION)
 * - 함께 보기: detail/hero/HeroIdentity.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import type { CelebReality } from "@feelandnote/shared/constants/celeb-tiers";
import CelebRealityLabel from "@/components/shared/CelebRealityLabel";

const chipClass =
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium leading-none";

export function CelebTierBadge({ reality }: { reality?: CelebReality | null }) {
  const t = useTranslations("celebPage");
  if (!reality || reality === "REAL") return null;
  if (reality === "BOTH") return <CelebRealityLabel reality={reality} />;

  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <span className={`${chipClass} border-accent/30 bg-accent/10 text-accent`}>
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        {t("realityChipFiction")}
      </span>
    </span>
  );
}
