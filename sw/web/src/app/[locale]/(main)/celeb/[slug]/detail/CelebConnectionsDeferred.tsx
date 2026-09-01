/*
  파일명: /app/(main)/celeb/[slug]/detail/CelebConnectionsDeferred.tsx
  기능: 관계 구획(관계망·세력도감)을 화면이 다가왔을 때 불러온다
  책임: 인물 목록과 세력 화보는 첫 화면 밖이고 검색 본문이 아니면서 한 장에 100KB에 육박한다.
        서버 HTML에 실으면 ISR 한 장이 굳을 때마다 그대로 복사된다.
        기다리는 동안은 자리만 지키고, 실패하면 제자리에 다시 시도 단추를 세운다.
*/ // ------------------------------

"use client";

import { useEffect, useState } from "react";

import {
  getCelebConnections,
  type CelebConnectionsData,
} from "@/actions/celebs/getCelebSideData";
import { PendingBlock, RetryBlock } from "@/components/ui/pending";

import type { ServiceItem } from "../celebServiceItems";
import PeopleAndEraTabs from "../PeopleAndEraTabs";

type LoadStatus = "loading" | "ready" | "failed";

interface Props {
  slug: string;
  locale: string;
  item: ServiceItem;
  centerName: string;
  centerAvatarUrl: string | null;
  currentCelebId: string;
  isFiction: boolean;
}

export default function CelebConnectionsDeferred({
  slug,
  locale,
  item,
  centerName,
  centerAvatarUrl,
  currentCelebId,
  isFiction,
}: Props) {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [data, setData] = useState<CelebConnectionsData | null>(null);
  // 다시 시도 횟수. 값이 바뀌면 조회를 한 번 더 돌린다.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        const result = await getCelebConnections(slug, locale);
        if (!isActive) return;
        setData(result);
        setStatus("ready");
      } catch (error) {
        console.error(`Load celeb connections error (try ${attempt + 1}):`, error);
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
    <PeopleAndEraTabs
      item={item}
      centerName={centerName}
      centerAvatarUrl={centerAvatarUrl}
      relations={data.relations}
      factions={data.factions}
      currentCelebId={currentCelebId}
      isFiction={isFiction}
    />
  );
}
