"use client";

import { ArrowRight, Check, MapPin, Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { getNeighbors } from "./engine";
import { MAX_NEIGHBORS_SHOWN, type AdjacencyEdge, type TravelCeleb, type TravelGraph, type TravelPuzzle, type TravelStep } from "./types";

interface Props {
  graph: TravelGraph;
  puzzle: TravelPuzzle;
  currentId: string;
  path: TravelStep[];
  onMove: (targetId: string, edge: AdjacencyEdge) => void;
  onGiveUp: () => void;
}

export default function TravelBoard({
  graph,
  puzzle,
  currentId,
  path,
  onMove,
  onGiveUp,
}: Props) {
  const t = useTranslations("gameTravel");
  const [searchQuery, setSearchQuery] = useState("");

  const stepsUsed = path.length;
  const stepsRemaining = puzzle.budget - stepsUsed;

  const currentCeleb = graph.celebs[currentId];
  const startCeleb = graph.celebs[puzzle.startId];
  const endCeleb = graph.celebs[puzzle.endId];

  // 이웃 목록 (visited 제외, 검색 필터, 상한 적용)
  const visitedIds = useMemo(() => {
    const s = new Set<string>([puzzle.startId]);
    for (const step of path) s.add(step.celebId);
    return s;
  }, [path, puzzle.startId]);

  const neighbors = useMemo(() => {
    const all = getNeighbors(graph.adjacency, currentId);
    // 이미 방문한 곳은 제외 (단, 도착지는 항상 보여준다)
    return all.filter((e) => !visitedIds.has(e.targetId) || e.targetId === puzzle.endId);
  }, [graph.adjacency, currentId, visitedIds, puzzle.endId]);

  const filteredNeighbors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = neighbors;
    if (q) {
      list = list.filter((e) => {
        const c = graph.celebs[e.targetId];
        return (
          c?.nickname.toLowerCase().includes(q) ||
          c?.nicknameEn.toLowerCase().includes(q)
        );
      });
    }
    return list.slice(0, MAX_NEIGHBORS_SHOWN);
  }, [neighbors, searchQuery, graph.celebs]);

  return (
    <div className="m-auto flex w-full max-w-2xl flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-4">
      {/* 진행 표시 */}
      <div className="flex items-center justify-between text-xs text-text-secondary sm:text-sm">
        <span>{t("stepsUsed", { used: stepsUsed, budget: puzzle.budget })}</span>
        <span className={stepsRemaining <= 1 ? "font-bold text-amber-300" : ""}>
          {t("stepsRemaining", { remaining: stepsRemaining })}
        </span>
      </div>

      {/* 예산 바 */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${
            stepsRemaining <= 1 ? "bg-amber-400" : "bg-emerald-400"
          }`}
          style={{ width: `${Math.max(0, (stepsRemaining / puzzle.budget) * 100)}%` }}
        />
      </div>

      {/* 출발 → 현재 → 도착 헤더 */}
      <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
        <CelebPill celeb={startCeleb} variant="start" label={t("start")} />
        <ArrowRight className="h-3 w-3 text-text-secondary" aria-hidden />
        <CelebPill celeb={currentCeleb} variant="current" label={t("current")} />
        <ArrowRight className="h-3 w-3 text-text-secondary" aria-hidden />
        <CelebPill celeb={endCeleb} variant="end" label={t("destination")} />
      </div>

      {/* 경로 이력 */}
      {path.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-2 text-xs text-text-secondary">
          <span className="font-bold text-emerald-300">{startCeleb?.nickname}</span>
          {path.map((step, i) => (
            <span key={i} className="flex items-center gap-1">
              <ArrowRight className="h-3 w-3" aria-hidden />
              <span className="italic text-text-secondary/70">
                ({step.reason.type === "content" ? "📖" : "🏷️"} {step.reason.label})
              </span>
              <ArrowRight className="h-3 w-3" aria-hidden />
              <span className="font-bold text-text-primary">
                {graph.celebs[step.celebId]?.nickname}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* 이웃 검색 */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("searchNeighbor")}
          aria-label={t("searchNeighborAria")}
          className="w-full rounded-lg border border-white/15 bg-bg-main/80 px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-emerald-400/50 focus:outline-none"
        />
      </div>

      {/* 이웃 목록 */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="list" aria-label={t("neighborListAria")}>
        {filteredNeighbors.length === 0 && (
          <p className="col-span-full py-4 text-center text-xs text-text-secondary">
            {t("noNeighbors")}
          </p>
        )}
        {filteredNeighbors.map((edge) => {
          const celeb = graph.celebs[edge.targetId];
          if (!celeb) return null;
          const isDestination = edge.targetId === puzzle.endId;
          return (
            <button
              key={edge.targetId}
              type="button"
              onClick={() => onMove(edge.targetId, edge)}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left hover:border-emerald-400/60 hover:bg-emerald-500/5 active:scale-[0.98] ${
                isDestination
                  ? "border-amber-400/40 bg-amber-500/[0.06]"
                  : "border-white/10 bg-white/[0.02]"
              }`}
              role="listitem"
            >
              {/* Avatar placeholder */}
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isDestination
                  ? "border border-amber-400/40 bg-amber-500/15 text-amber-300"
                  : "border border-white/15 bg-white/5 text-text-secondary"
              }`}>
                {isDestination ? <Flag className="h-4 w-4" /> : celeb.nickname[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-bold ${
                  isDestination ? "text-amber-200" : "text-text-primary"
                }`}>
                  {celeb.nickname}
                  {isDestination && (
                    <span className="ml-1.5 text-[10px] font-normal text-amber-300">
                      {t("destinationBadge")}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-text-secondary">
                  {edge.reasons.map((r) => (
                    r.type === "content" ? `📖 ${r.label}` : `🏷️ ${r.label}`
                  )).join(" · ")}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 이웃 수 표시 + 포기 */}
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>{t("neighborCount", { shown: filteredNeighbors.length, total: neighbors.length })}</span>
        <button
          type="button"
          onClick={onGiveUp}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-text-secondary hover:border-white/25 hover:text-text-primary active:scale-[0.98]"
        >
          {t("giveUp")}
        </button>
      </div>
    </div>
  );
}

function CelebPill({
  celeb,
  variant,
  label,
}: {
  celeb: TravelCeleb | undefined;
  variant: "start" | "current" | "end";
  label: string;
}) {
  const colors = {
    start: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
    current: "border-sky-400/30 bg-sky-500/10 text-sky-300",
    end: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  };
  const icons = {
    start: <MapPin className="h-3 w-3" />,
    current: <Check className="h-3 w-3" />,
    end: <Flag className="h-3 w-3" />,
  };

  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${colors[variant]}`}>
      {icons[variant]}
      <span className="max-w-20 truncate font-bold sm:max-w-32">
        {celeb?.nickname ?? "?"}
      </span>
      <span className="hidden text-[10px] opacity-60 sm:inline">({label})</span>
    </div>
  );
}
