"use client";

import CelebSectionSkeleton from "@/components/features/celeb/CelebSectionSkeleton";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { getGuestbookEntries } from "@/actions/guestbook";
import { createClient } from "@/lib/db/client";
import { RetryBlock } from "@/components/ui/pending";
import type { GuestbookEntryWithAuthor } from "@/types/database";
import GuestbookContent from "./GuestbookContent";

/** 실시간 목록과 로그인 상태는 독자가 방명록을 열 때 함께 준비한다. */
export default function GuestbookDeferred({ profileId, isFiction = false }: {
  profileId: string;
  isFiction?: boolean;
}) {
  const t = useTranslations("celebPage");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [result, setResult] = useState<{
    entries: GuestbookEntryWithAuthor[]; total: number; userId: string | null;
  } | null>(null);

  const load = async () => {
    setStatus("loading");
    try {
      const [entries, auth] = await Promise.all([
        getGuestbookEntries({ profileId, subjectKind: "celeb", limit: 10, offset: 0 }),
        createClient().auth.getUser(),
      ]);
      setResult({ ...entries, userId: auth.data.user?.id ?? null });
      setStatus("ready");
    } catch {
      setStatus("failed");
    }
  };

  if (status === "idle") return (
    <button type="button" onClick={() => void load()} aria-expanded={false}
      className="w-full rounded border border-white/15 px-4 py-5 text-sm text-text-secondary hover:border-accent/50 hover:bg-accent/5 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
      {t("guestbookOpen")}
    </button>
  );
  if (status === "failed") return <RetryBlock onRetry={() => void load()} />;
  if (!result) return <CelebSectionSkeleton kind="guestbook" />;
  return <GuestbookContent profileId={profileId} currentUserId={result.userId} isOwner={false}
    initialEntries={result.entries} initialTotal={result.total} isFiction={isFiction} variant="celeb" />;
}
