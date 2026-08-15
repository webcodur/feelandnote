/*
  파일명: /components/features/profile/GuestbookDeferred.tsx
  기능: 인물 상세 방명록의 첫 목록을 화면이 다가왔을 때 불러온다
  책임: 인물 상세는 ISR로 굳는 화면이라 방명록을 서버 HTML에 실으면 7일간 옛 글이 남는다.
        마운트 시점에 공개 목록을 직접 조회해 GuestbookContent에 seed로 넘긴다.
        기다리는 동안은 자리만 지키고, 실패하면 제자리에 다시 시도 단추를 세운다.
*/ // ------------------------------

"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { getPublicGuestbookEntries } from "@/actions/guestbook";
import { PendingBlock, RetryBlock } from "@/components/ui/pending";
import type { GuestbookEntryWithAuthor } from "@/types/database";

import GuestbookContent from "./GuestbookContent";

type LoadStatus = "loading" | "ready" | "failed";

interface Props {
  profileId: string;
  isFiction?: boolean;
}

export default function GuestbookDeferred({
  profileId,
  isFiction = false,
}: Props) {
  const t = useTranslations("pending");
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [entries, setEntries] = useState<GuestbookEntryWithAuthor[]>([]);
  const [total, setTotal] = useState(0);
  // 다시 시도 횟수. 값이 바뀌면 조회를 한 번 더 돌린다.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isActive = true;

    const loadEntries = async () => {
      try {
        const result = await getPublicGuestbookEntries({ profileId });
        if (!isActive) return;
        setEntries(result.entries);
        setTotal(result.total);
        setStatus("ready");
      } catch (error) {
        console.error(`Load celeb guestbook error (try ${attempt + 1}):`, error);
        if (isActive) setStatus("failed");
      }
    };
    void loadEntries();

    return () => {
      isActive = false;
    };
  }, [attempt, profileId]);

  const handleRetry = () => {
    setStatus("loading");
    setAttempt((prev) => prev + 1);
  };

  if (status === "failed") {
    return <RetryBlock onRetry={handleRetry} />;
  }

  if (status === "loading") {
    return <PendingBlock variant="rows" count={3} label={t("loading")} />;
  }

  return (
    <GuestbookContent
      profileId={profileId}
      isOwner={false}
      initialEntries={entries}
      initialTotal={total}
      hideEmptyState
      isFiction={isFiction}
      variant="celeb"
    />
  );
}
