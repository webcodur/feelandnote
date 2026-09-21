/** 사용자 선택 뒤 세력도감만 조회한다. 시간 단위 목록 캐시를 초기 ISR에 섞지 않는다. */
"use client";

import { useEffect, useState } from "react";

import {
  getCelebFactions,
  type CelebFactionsData,
} from "@/actions/celebs/getCelebSideData";
import { PendingBlock, RetryBlock } from "@/components/ui/pending";

import FactionSection from "../FactionSection";

type LoadStatus = "loading" | "ready" | "failed";

interface Props {
  slug: string;
  locale: string;
  centerName: string;
  centerAvatarUrl: string | null;
  currentCelebId: string;
}

export default function CelebFactionDeferred({
  slug,
  locale,
  centerName,
  centerAvatarUrl,
  currentCelebId,
}: Props) {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [data, setData] = useState<CelebFactionsData | null>(null);
  // 다시 시도 횟수. 값이 바뀌면 조회를 한 번 더 돌린다.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        const result = await getCelebFactions(slug, locale);
        if (!isActive) return;
        setData(result);
        setStatus("ready");
      } catch (error) {
        console.error(`Load celeb factions error (try ${attempt + 1}):`, error);
        if (isActive) setStatus("failed");
      }
    };
    void load();

    return () => {
      isActive = false;
    };
  }, [attempt, locale, slug]);

  const handleRetry = () => {
    setStatus("loading");
    setAttempt((prev) => prev + 1);
  };

  if (status === "failed") return <RetryBlock onRetry={handleRetry} />;
  if (status !== "ready" || !data) {
    return <PendingBlock variant="panel" minHeight="min-h-64" className="py-7" />;
  }

  return (
    <FactionSection
      ownerName={centerName}
      ownerAvatarUrl={centerAvatarUrl}
      factions={data.factions}
      memberships={data.memberships}
      currentCelebId={currentCelebId}
    />
  );
}
