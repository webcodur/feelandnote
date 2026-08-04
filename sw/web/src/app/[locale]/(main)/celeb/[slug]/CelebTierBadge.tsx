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
