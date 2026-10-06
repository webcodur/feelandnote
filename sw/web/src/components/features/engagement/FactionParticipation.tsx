"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";
import { incrementFactionView } from "@/actions/engagement/incrementFactionView";
import { shouldCountPageView } from "@/lib/celeb/viewDedup";
import ShareButtons from "@/components/ui/ShareButtons";
import PageLikeButton from "./PageLikeButton";

interface Props { factionId: string; slug: string; name: string }

export default function FactionParticipation({ factionId, slug, name }: Props) {
  const t = useTranslations("participation");
  const [views, setViews] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    void incrementFactionView(factionId, shouldCountPageView("faction", factionId))
      .then((count) => { if (alive) setViews(count); })
      .catch(() => { if (alive) setViews(null); });
    return () => { alive = false; };
  }, [factionId]);
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" data-faction-participation>
      <PageLikeButton key={factionId} kind="faction" targetId={factionId} />
      <span className="inline-flex h-9 items-center gap-1.5 px-2 text-sm text-text-secondary" title={t("viewsHint")} data-faction-views>
        <Eye size={16} aria-hidden /><span>{t("views")}</span>
        <span className="font-mono text-xs tabular-nums" aria-live="polite">{views === null ? "—" : views.toLocaleString()}</span>
      </span>
      <ShareButtons title={name} path={`/explore/faction/${slug}`} align="center" />
    </div>
  );
}
