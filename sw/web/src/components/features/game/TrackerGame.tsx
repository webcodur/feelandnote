/*
  파일명: components/features/game/TrackerGame.tsx
  기능: 인물추적 게임 메인 컴포넌트
  책임: 5단계 배제형 힌트 해금 게임 플로우 관리 (6명 후보)
    - Stage 1 (단서 1): 콘텐츠 1개 — 시작 시 무료
    - Stage 2 (단서 2): 콘텐츠 2개째 — 배제 1회로 해금
    - Stage 3 (단서 3): 콘텐츠 3개째 — 배제 2회로 해금
    - Stage 4 (단서 4): 콘텐츠 4개째 — 배제 3회로 해금
    - Stage 5 (철학): 감상 철학 — 배제 4회로 해금
*/
"use client";

import { useState, useCallback, useEffect, useMemo, type MutableRefObject } from "react";
import { CheckCircle, BookOpen, Brain, Lock, ShieldCheck, Search } from "lucide-react";
import { getTrackerRound, type TrackerRound } from "@/actions/game/getTrackerRound";
import { cn } from "@/lib/utils";
import ContentReveal from "./tracker/ContentReveal";
import PhilosophyReveal from "./tracker/PhilosophyReveal";
import MultipleChoice from "./tracker/MultipleChoice";
import TrackerResult from "./tracker/TrackerResult";

type GameStage = "idle" | "loading" | "stage1" | "stage2" | "stage3" | "stage4" | "stage5" | "result";

const HINT_STAGES = [
  { key: "stage1", label: "단서 1", icon: Search },
  { key: "stage2", label: "단서 2", icon: Search },
  { key: "stage3", label: "단서 3", icon: BookOpen },
  { key: "stage4", label: "단서 4", icon: BookOpen },
  { key: "stage5", label: "철학", icon: Brain },
] as const;

interface TrackerGameProps {
  onEnterFullScreen?: () => void;
  onHomeRef?: MutableRefObject<(() => void) | null>;
  onPhaseChange?: (phase: string) => void;
  onStartRef?: MutableRefObject<((excludeIds?: string[]) => void) | null>;
}

export default function TrackerGame({ onEnterFullScreen, onHomeRef, onPhaseChange, onStartRef }: TrackerGameProps = {}) {
  const [stage, setStage] = useState<GameStage>("idle");
  const [round, setRound] = useState<TrackerRound | null>(null);
  const [eliminatedIds, setEliminatedIds] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [viewStage, setViewStage] = useState<GameStage>("stage1");
  const [eliminateToast, setEliminateToast] = useState<string | null>(null);

  // 해금: stage1 무료, stage2=배제1회, ... stage5=배제4회
  const unlockedIndex = useMemo(() => {
    return Math.min(eliminatedIds.length, 4);
  }, [eliminatedIds]);

  // stage 진행 시 viewStage 동기화
  useEffect(() => {
    if (stage === "stage1" || stage === "stage2" || stage === "stage3" || stage === "stage4" || stage === "stage5") {
      setViewStage(stage);
    }
  }, [stage]);

  useEffect(() => { onPhaseChange?.(stage); }, [stage, onPhaseChange]);

  const startRound = useCallback(async (excludeIds: string[] = []) => {
    setStage("loading");
    setEliminatedIds([]);
    setEliminateToast(null);
    setSolved(false);
    setCorrect(false);
    const data = await getTrackerRound(excludeIds);
    if (!data) { setStage("idle"); return; }
    setRound(data);
    setStage("stage1");
  }, []);

  const goToResult = useCallback(() => setStage("result"), []);

  // 배제 핸들러
  const handleEliminate = useCallback(
    (id: string) => {
      if (!round || solved) return;
      if (id === round.celebId) {
        setCorrect(false);
        setSolved(true);
        return;
      }
      const newEliminated = [...eliminatedIds, id];
      setEliminatedIds(newEliminated);
      const eliminated = round.options.find(o => o.id === id);
      setEliminateToast(eliminated?.nickname ?? "용의자");
      setTimeout(() => setEliminateToast(null), 1500);
      // 배제 성공 → 다음 stage 해금 및 자동 이동
      if (newEliminated.length === 1) setStage("stage2");
      else if (newEliminated.length === 2) setStage("stage3");
      else if (newEliminated.length === 3) setStage("stage4");
      else if (newEliminated.length === 4) setStage("stage5");
    },
    [round, solved, eliminatedIds]
  );

  const handleChoiceSelect = useCallback(
    (selectedId: string) => {
      if (!round) return;
      const isCorrect = selectedId === round.celebId;
      setCorrect(isCorrect);
      setSolved(true);
    },
    [round]
  );

  const handleNext = useCallback(() => {
    if (!round) return;
    const newUsed = [...usedIds, round.celebId];
    setUsedIds(newUsed);
    startRound(newUsed);
  }, [round, usedIds, startRound]);

  const handleQuit = useCallback(() => {
    setStage("idle");
    setRound(null);
    setUsedIds([]);
  }, []);

  useEffect(() => {
    if (onHomeRef) onHomeRef.current = handleQuit;
  }, [onHomeRef, handleQuit]);
  useEffect(() => {
    if (onStartRef) onStartRef.current = startRound;
  }, [onStartRef, startRound]);

  const canEliminate = eliminatedIds.length < 4 && !solved;

  // region: 로딩
  if (stage === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-accent animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-sm text-text-secondary font-serif">인물 추적 준비 중...</p>
        </div>
      </div>
    );
  }

  if (stage === "idle") return null;
  if (!round) return null;

  return (
    <div className="w-full relative flex-1 flex flex-col">
      {/* 배제 성공 토스트 */}
      {eliminateToast && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 pointer-events-none z-50 animate-score-float">
          <div className="flex items-center gap-2 rounded-xl bg-[#0f1a14] border border-green-500/40 px-5 py-3 shadow-lg shadow-green-500/10">
            <ShieldCheck size={20} className="text-green-400 shrink-0" />
            <span className="text-sm font-serif font-bold text-green-400">
              {eliminateToast} 배제 성공!
            </span>
          </div>
        </div>
      )}

      {/* 중앙 콘텐츠 */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-lg w-full flex flex-col pb-4">

        {stage !== "result" && (
          <div className="flex flex-col">
            {/* ── 질문 ── */}
            <p className="text-center text-sm font-serif text-text-secondary mb-2">
              이 인물은 누구일까요?
            </p>

            {/* ── 단계 표시기 ── */}
            <div className="shrink-0 flex items-center justify-center gap-1 mb-3 px-1">
              {HINT_STAGES.map((hs, i) => {
                const isUnlocked = i <= unlockedIndex;
                const isViewing = viewStage === hs.key;
                const isCurrent = i === unlockedIndex;
                const Icon = hs.icon;
                return (
                  <button
                    key={hs.key}
                    onClick={() => isUnlocked && setViewStage(hs.key as GameStage)}
                    disabled={!isUnlocked}
                    className={cn(
                      "relative flex flex-col items-center gap-1 w-16 py-2 rounded-lg text-xs font-semibold transition-all",
                      isViewing
                        ? "text-accent bg-[#1a1710] border border-accent/30"
                        : isUnlocked
                          ? "text-text-secondary hover:text-white hover:bg-[#1a1a1a] border border-transparent"
                          : "text-white/20 cursor-default border border-transparent",
                      isCurrent && !isViewing && isUnlocked && "text-text-primary"
                    )}
                  >
                    {isUnlocked ? <Icon size={18} /> : <Lock size={14} className="opacity-40" />}
                    <span>{hs.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ── 힌트 콘텐츠 ── */}
            <div className="px-1">
              {/* Stage 1~4: 콘텐츠 단서 (각 탭이 1개씩 표시) */}
              {(viewStage === "stage1" || viewStage === "stage2" || viewStage === "stage3" || viewStage === "stage4") && (() => {
                const idx = parseInt(viewStage.replace("stage", "")) - 1;
                const content = round.contents[idx];
                return content ? (
                  <ContentReveal content={content} index={idx} total={round.contents.length} />
                ) : (
                  <div className="flex items-center justify-center py-8 text-text-secondary text-sm font-serif">
                    {idx === 0 ? "단서가 없습니다" : "추가 단서가 없습니다"}
                  </div>
                );
              })()}
              {/* Stage 5: 감상 철학 */}
              {viewStage === "stage5" && (
                <div>
                  {round.consumptionPhilosophy ? (
                    <PhilosophyReveal philosophy={round.consumptionPhilosophy} />
                  ) : (
                    <div className="flex items-center justify-center py-8 text-text-secondary text-sm font-serif">
                      단서가 없습니다
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── 하단 영역 ── */}
            <div className="shrink-0">
              {!solved && (
                <div className="pt-3">
                  <p className="text-center text-[11px] text-text-tertiary mb-2">
                    한 명을 배제하거나 정답을 맞추세요
                  </p>
                  <MultipleChoice
                    key={round.celebId}
                    options={round.options}
                    correctId={round.celebId}
                    eliminatedIds={eliminatedIds}
                    canEliminate={canEliminate}
                    onSelect={handleChoiceSelect}
                    onEliminate={handleEliminate}
                  />
                </div>
              )}
              {solved && (
                <div className="w-full max-w-sm mx-auto pt-3 space-y-3 animate-in fade-in">
                  <div className={cn(
                    "flex items-center justify-center gap-2 rounded-lg px-4 py-3",
                    correct
                      ? "border border-accent/40 bg-[#1a1710]"
                      : "border border-red-500/40 bg-[#1a0f0f]"
                  )}>
                    <CheckCircle size={18} className={correct ? "text-accent" : "text-red-400"} />
                    <span className={cn("text-sm font-bold font-serif", correct ? "text-accent" : "text-red-400")}>
                      {correct ? "정답!" : "오답"}
                    </span>
                  </div>
                  <button
                    onClick={goToResult}
                    className="w-full h-11 rounded-xl text-sm font-bold font-serif bg-[#1a1710] text-accent hover:bg-[#231f15] border border-accent/30 active:scale-95"
                  >
                    결과 보기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {stage === "result" && (
          <TrackerResult
            celebId={round.celebId}
            celebSlug={round.celebSlug}
            nickname={round.nickname}
            profession={round.profession}
            avatarUrl={round.avatarUrl}
            correct={correct}
            contents={round.contents}
            onNext={handleNext}
            onQuit={handleQuit}
          />
        )}
        </div>
      </div>
    </div>
  );
}
