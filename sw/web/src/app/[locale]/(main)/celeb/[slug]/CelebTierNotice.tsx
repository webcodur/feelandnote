"use client";

import { useTranslations } from "next-intl";
import { Sparkles, Link2 } from "lucide-react";
import type { CelebTier } from "@feelandnote/shared/constants/celeb-tiers";

// 배지·안내를 두는 등급만 정의한다. full·light는 대다수라 따로 표시하지 않는다.
const NOTICE_TIERS = {
  fiction: { badge: "tierFictionBadge", notice: "tierFictionNotice", Icon: Sparkles },
  relation: { badge: "tierRelationBadge", notice: "tierRelationNotice", Icon: Link2 },
} as const;

type NoticeTier = keyof typeof NOTICE_TIERS;

function hasNotice(tier: CelebTier | null | undefined): tier is NoticeTier {
  return !!tier && tier in NOTICE_TIERS;
}

export function CelebTierBadge({ tier }: { tier?: CelebTier | null }) {
  const t = useTranslations("celebPage");
  if (!hasNotice(tier)) return null;

  const { badge, Icon } = NOTICE_TIERS[tier];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 align-middle text-base font-medium leading-tight text-accent/90 sm:text-lg">
      <Icon className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" />
      {t(badge)}
    </span>
  );
}

export function CelebTierNotice({ tier }: { tier?: CelebTier | null }) {
  const t = useTranslations("celebPage");
  if (!hasNotice(tier)) return null;

  return (
    <p className="rounded-lg border border-accent/15 bg-accent/5 px-4 py-3 text-base leading-relaxed break-keep text-start sm:text-lg">
      {t(NOTICE_TIERS[tier].notice)}
    </p>
  );
}
