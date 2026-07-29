"use client";

import { useTranslations } from "next-intl";
import { Sparkles, Link2 } from "lucide-react";
import type { CelebTier } from "@feelandnote/shared/constants/celeb-tiers";

// 배지가 필요한 등급과 별도 설명까지 필요한 등급을 구분한다.
const BADGE_TIERS = {
  fiction: { badge: "tierFictionBadge", Icon: Sparkles },
  relation: { badge: "tierRelationBadge", Icon: Link2 },
} as const;

const NOTICE_TIERS = {
  relation: "tierRelationNotice",
} as const;

type BadgeTier = keyof typeof BADGE_TIERS;
type NoticeTier = keyof typeof NOTICE_TIERS;

function hasBadge(tier: CelebTier | null | undefined): tier is BadgeTier {
  return !!tier && tier in BADGE_TIERS;
}

function hasNotice(tier: CelebTier | null | undefined): tier is NoticeTier {
  return !!tier && tier in NOTICE_TIERS;
}

export function CelebTierBadge({ tier }: { tier?: CelebTier | null }) {
  const t = useTranslations("celebPage");
  if (!hasBadge(tier)) return null;

  const { badge, Icon } = BADGE_TIERS[tier];
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
      {t(NOTICE_TIERS[tier])}
    </p>
  );
}
