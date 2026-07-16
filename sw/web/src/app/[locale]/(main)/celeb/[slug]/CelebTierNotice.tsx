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
    <span className="inline-flex items-center gap-1 align-middle rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent/90">
      <Icon size={11} />
      {t(badge)}
    </span>
  );
}

export function CelebTierNotice({ tier }: { tier?: CelebTier | null }) {
  const t = useTranslations("celebPage");
  if (!hasNotice(tier)) return null;

  return (
    <p className="rounded-lg border border-accent/15 bg-accent/5 px-3 py-2 text-xs leading-relaxed text-text-tertiary break-keep text-start">
      {t(NOTICE_TIERS[tier].notice)}
    </p>
  );
}
