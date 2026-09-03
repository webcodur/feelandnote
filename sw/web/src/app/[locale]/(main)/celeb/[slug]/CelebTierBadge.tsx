/* ─────────────────────────────────────────────
 * [celeb 상세] 머리말 — 가상 인물 뱃지
 * - 목차 위치: 머리말 (introduction)
 * - 데이터: tier prop
 * - 함께 보기: detail/CelebHeroSection.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import type { CelebTier } from "@feelandnote/shared/constants/celeb-tiers";

export function CelebTierBadge({ tier }: { tier?: CelebTier | null }) {
  const t = useTranslations("celebPage");
  if (tier !== "fiction") return null;

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 align-middle text-base font-medium leading-tight text-accent/90 sm:text-lg">
      <Sparkles className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" />
      {t("tierFictionBadge")}
    </span>
  );
}
