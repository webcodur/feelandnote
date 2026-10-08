"use client";

import CelebSectionPending from '../CelebSectionPending';
import { useCallback, useEffect, useState } from "react";
import { useNearViewport } from '@/components/ui/pending/useNearViewport';
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
  const [attempted, setAttempted] = useState(false);
  const { ref, isNear } = useNearViewport('400px 0px');
  const hasSpectrum = !!item.children?.some(child => child.key === 'spectrum');
  const hasInfluence = !!item.children?.some(child => child.key === 'influence');
  const retry = useCallback(async () => {
    setLoading(true);
    setAttempted(true);
    try {
      setData(await getCelebInitialAnalysis(celebId, locale, {
        spectrum: hasSpectrum,
        influence: hasInfluence,
      }));
    } catch (error) {
      console.error("Retry celeb analysis failed:", error);
    } finally {
      setLoading(false);
    }
  }, [celebId, locale, hasSpectrum, hasInfluence]);
  useEffect(() => { if (isNear && !attempted) void retry(); }, [isNear, attempted, retry]);
  return <div ref={ref}>
    {data && <FigureAnalysisTabs item={item} celebId={celebId} spectrumData={data.spectrum}
      influenceData={data.influence} influenceExplorerData={data.influenceExplorer} />}
    {!data && (!attempted || loading) && <CelebSectionPending kind="analysis" />}
    {!data && attempted && !loading && <RetryBlock onRetry={() => void retry()} />}
  </div>;
}
