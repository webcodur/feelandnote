"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";
import { incrementFactionView } from "@/actions/engagement/incrementFactionView";
import { recordPageView } from "@/lib/celeb/viewDedup";
import ShareButtons from "@/components/ui/ShareButtons";
import PageLikeButton from "./PageLikeButton";

interface Props { factionId: string; slug: string; name: string; kind?: "faction" | "myth" }

export default function FactionParticipation({ factionId, slug, name, kind = "faction" }: Props) {
  const t = useTranslations("participation");
  const [views, setViews] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    void recordPageView("faction", factionId, incrementFactionView)
      .then((count) => { if (alive) setViews(count); })
      .catch(() => { if (alive) setViews(null); });
    return () => { alive = false; };
  }, [factionId]);
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" data-faction-participation>
      <span className="inline-flex h-9 items-center justify-center gap-1.5 px-2 text-xs text-text-tertiary" title={t("viewsHint")} data-faction-views>
        <Eye size={16} aria-hidden /><span>{t("views")}</span>
        <span className="font-mono text-xs tabular-nums" aria-live="polite">{views === null ? "—" : views.toLocaleString()}</span>
      </span>
      <PageLikeButton key={factionId} kind="faction" targetId={factionId} className="min-h-10 justify-center border-line-strong" />
      <ShareButtons title={name} path={`/explore/${kind}/${slug}`} align="center" comfortable className="[&>button]:border-line-strong" />
    </div>
  );
}
