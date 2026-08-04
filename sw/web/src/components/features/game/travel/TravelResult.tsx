"use client";

import { Trophy, RotateCcw, Home, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TravelGraph, TravelResult } from "./types";

interface Props {
  result: TravelResult;
  graph: TravelGraph;
  startId: string;
  endId: string;
  onReplay: () => void;
  onLobby: () => void;
}

export default function TravelResultView({
  result,
  graph,
  startId,
  endId,
  onReplay,
  onLobby,
}: Props) {
  const t = useTranslations("gameTravel");

  const isSuccess = result.outcome === "success";
  const isOverBudget = result.outcome === "over_budget";

  return (
    <div className="m-auto flex w-full max-w-lg flex-col items-center gap-5 px-4 py-6 text-center">
      {/* 아이콘 */}
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full border ${
          isSuccess
            ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300"
            : isOverBudget
              ? "border-amber-400/50 bg-amber-500/15 text-amber-300"
              : "border-white/20 bg-white/5 text-text-secondary"
        }`}
      >
        {isSuccess ? (
          <Trophy className="h-7 w-7" aria-hidden />
        ) : isOverBudget ? (
          <AlertTriangle className="h-7 w-7" aria-hidden />
        ) : (
          <Home className="h-7 w-7" aria-hidden />
        )}
      </div>

      {/* 제목 */}
      <h2 className="font-serif text-2xl font-black text-text-primary sm:text-3xl">
        {isSuccess
          ? t("resultSuccess")
          : isOverBudget
            ? t("resultOverBudget")
            : t("resultGiveUp")}
      </h2>

      {/* 점수 */}
      <p className="text-base text-text-secondary">
        {t("resultScore", { score: result.score })}
      </p>

      {/* 내 경로 */}
      <div className="w-full rounded-xl border border-white/10 bg-bg-main/70 p-4 text-left">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
          {t("yourPath")}
        </h3>
        <PathDisplay
          nodeIds={[startId, ...result.path.map((s) => s.celebId)]}
          graph={graph}
          endId={endId}
        />
        <p className="mt-2 text-xs text-text-secondary">
          {t("stepsCount", { count: result.path.length })}
        </p>
      </div>

      {/* 최적 경로 */}
      <div className="w-full rounded-xl border border-emerald-400/15 bg-emerald-500/[0.03] p-4 text-left">
        <h3 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-300/80">
          <CheckCircle2 className="h-3 w-3" /> {t("optimalPath")}
        </h3>
        <PathDisplay nodeIds={result.optimalPath} graph={graph} endId={endId} />
        <p className="mt-2 text-xs text-text-secondary">
          {t("stepsCount", { count: result.optimalPath.length - 1 })}
        </p>
      </div>

      {/* 버튼 */}
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={onReplay}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-500/15 px-5 py-2.5 text-sm font-bold text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/25 active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          {t("replay")}
        </button>
        <button
          type="button"
          onClick={onLobby}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-text-secondary hover:border-white/30 hover:bg-white/10 active:scale-[0.98]"
        >
          <Home className="h-4 w-4" aria-hidden />
          {t("toLobby")}
        </button>
      </div>
    </div>
  );
}

function PathDisplay({
  nodeIds,
  graph,
  endId,
}: {
  nodeIds: string[];
  graph: TravelGraph;
  endId: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {nodeIds.map((id, i) => {
        const celeb = graph.celebs[id];
        const isEnd = id === endId;
        return (
          <span key={`${id}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ArrowRight className="h-3 w-3 text-text-secondary/50" aria-hidden />}
            <span
              className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${
                isEnd
                  ? "border border-amber-400/30 bg-amber-500/10 text-amber-200"
                  : "text-text-primary"
              }`}
            >
              {celeb?.nickname ?? id}
            </span>
          </span>
        );
      })}
    </div>
  );
}
