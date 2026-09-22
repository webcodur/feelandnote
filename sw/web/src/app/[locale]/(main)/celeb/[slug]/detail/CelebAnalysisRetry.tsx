"use client";

import CelebSectionSkeleton from "@/components/features/celeb/CelebSectionSkeleton";
import { useState } from "react";
import { getCelebInitialAnalysis, type CelebAnalysisData } from "@/actions/celebs/getCelebSideData";
import { RetryBlock } from "@/components/ui/pending";
import type { ServiceItem } from "../celebServiceItems";
import FigureAnalysisTabs from "../FigureAnalysisTabs";

/** 초기 분석 조회가 실패해도 본문은 남기고, 독자가 요청할 때 제자리에서 복구한다. */
export default function CelebAnalysisRetry({ celebId, locale, item }: {
  celebId: string; locale: string; item: ServiceItem;
}) {
  const [data, setData] = useState<CelebAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const retry = async () => {
    setLoading(true);
    try {
      setData(await getCelebInitialAnalysis(celebId, locale, {
        spectrum: !!item.children?.some(child => child.key === "spectrum"),
        influence: !!item.children?.some(child => child.key === "influence"),
      }));
    } catch (error) {
      console.error("Retry celeb analysis failed:", error);
    } finally {
      setLoading(false);
    }
  };
  if (data) return <FigureAnalysisTabs item={item} celebId={celebId} spectrumData={data.spectrum}
    influenceData={data.influence} influenceExplorerData={data.influenceExplorer} />;
  if (loading) return <CelebSectionSkeleton kind={item.children?.some(child => child.key === "spectrum") ? "spectrum" : "influence"} />;
  return <RetryBlock onRetry={() => void retry()} />;
}
