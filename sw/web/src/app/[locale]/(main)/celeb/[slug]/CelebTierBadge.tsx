/* ─────────────────────────────────────────────
 * [celeb 상세] 머리말 — 실존여부 칩
 * - 목차 위치: 머리말 (introduction)
 * - 데이터: reality prop(celeb_reality: REAL/BOTH/FICTION)
 * - 함께 보기: detail/hero/HeroIdentity.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useTranslations } from "next-intl";
import type { CelebReality } from "@feelandnote/shared/constants/celeb-tiers";

const chipClass =
  "inline-flex items-center rounded-md border px-2 py-1 text-sm font-medium leading-none";

export function CelebTierBadge({ reality }: { reality?: CelebReality | null }) {
  const t = useTranslations("celebPage");
  if (!reality || reality === "REAL") return null;

  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <span className="text-sm text-text-secondary">{t("realityLabel")}</span>
      {reality === "BOTH" ? (
        <span className={`${chipClass} border-accent-dim/30 bg-accent-dim/10 text-text-secondary`}>
          {t("realityChipReal")}
        </span>
      ) : null}
      <span className={`${chipClass} border-accent/30 bg-accent/10 text-accent/90`}>
        {t("realityChipFiction")}
      </span>
    </span>
  );
}
