/*
  파일명: /app/(main)/explore/spectrum/sections.tsx
  기능: 비범한 기록가 화면 본문
  책임: 극단값 + 기질의 서재 두 조회를 함께 기다린다. 실패하면 선택기는 남기고 무대 안에 다시 시도를 세운다.
        Lane 안에서 그려지므로 여기서 던지면 안 된다 — 완성 HTML 모드에서 화면 전체가 죽는다.
*/ // ------------------------------

import { getSpectrumExtremes } from "@/actions/home/getSpectrumExtremes";
import { getSpectrumAxisLibraries } from "@/actions/spectrum/getSpectrumAxisLibraries";
import FigureRankingBoard, { type RankingNavRow } from "@/components/features/user/explore/figureRankingBoard/FigureRankingBoard";
import SpectrumFullSection from "@/components/features/user/explore/sections/SpectrumFullSection";
import { RetryBlock } from "@/components/ui/pending";

export async function SpectrumBody({ navRows, accent }: { navRows: RankingNavRow[]; accent: string }) {
  let entries: Awaited<ReturnType<typeof getSpectrumExtremes>>;
  let libraries: Awaited<ReturnType<typeof getSpectrumAxisLibraries>>;
  try {
    [entries, libraries] = await Promise.all([
      // 1위 + 차순위 9명 = Top 10 — 분야별 챔피언과 같은 인원이다
      getSpectrumExtremes({ runnersUpLimit: 9 }),
      getSpectrumAxisLibraries(),
    ]);
  } catch (e) {
    console.error("[SpectrumPage] 본문 조회 실패:", e);
    return <FigureRankingBoard navRows={navRows} accent={accent}><RetryBlock /></FigureRankingBoard>;
  }
  // JSX 생성은 try 밖에서 한다 — try 안 JSX는 렌더 오류를 못 잡으면서 린트만 문다
  return <SpectrumFullSection entries={entries} libraries={libraries} />;
}
