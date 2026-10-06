"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { getPageLikes, likePage } from "@/actions/engagement/pageLikes";
import { canLikeAgain, LIKE_COOLDOWN_MS, type EngagementKind, type PageLikes } from "@/lib/page-engagement";

interface Props {
  kind: EngagementKind;
  targetId: string;
  className?: string;
}

export default function PageLikeButton({ kind, targetId, className = "" }: Props) {
  const t = useTranslations("participation");
  const [likes, setLikes] = useState<PageLikes | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const pending = useRef(false);
  const blocked = likes !== null && !canLikeAgain(likes.nextLikeAt, now);

  useEffect(() => {
    let alive = true;
    void getPageLikes(kind, targetId).then((result) => {
      if (!alive) return;
      setLikes(result);
      setFailed(result === null);
    }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [kind, targetId]);

  useEffect(() => {
    if (!likes?.nextLikeAt) return;
    const remaining = Date.parse(likes.nextLikeAt) - Date.now();
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), remaining + 100);
    return () => window.clearTimeout(timer);
  }, [likes?.nextLikeAt]);

  const handleLike = async () => {
    if (pending.current || (likes && !canLikeAgain(likes.nextLikeAt))) return;
    pending.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const result = await likePage(kind, targetId);
      if (result) { setLikes(result); setNow(Date.now()); }
      else setFailed(true);
    } catch { setFailed(true); }
    finally { pending.current = false; setBusy(false); }
  };

  const label = t(blocked ? "liked" : "like");
  const hint = t(blocked ? "cooldown" : "likeHint", { hours: LIKE_COOLDOWN_MS / (60 * 60 * 1000) });
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={() => void handleLike()} disabled={busy || blocked || (!likes && !failed)}
        aria-label={`${label}${likes ? ` ${likes.count.toLocaleString()}` : ""}. ${hint}`}
        aria-busy={busy || undefined} title={hint} data-page-like={kind}
        className={`inline-flex h-9 items-center gap-1.5 rounded-md border border-white/12 bg-transparent px-2.5 text-sm hover:border-accent/50 hover:bg-white/[0.04] hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-default ${blocked ? "text-accent" : "text-text-secondary"} ${className}`}>
        <Heart size={16} aria-hidden fill={blocked ? "currentColor" : "none"} />
        <span>{label}</span>
        <span className="font-mono text-xs tabular-nums" aria-live="polite">{likes ? likes.count.toLocaleString() : "—"}</span>
      </button>
      {failed && <span role="status" className="max-w-52 text-xs text-status-paused">{t("failed")}</span>}
    </span>
  );
}
