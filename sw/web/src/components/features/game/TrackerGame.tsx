/*
  파일명: components/features/game/TrackerGame.tsx
  기능: 미궁(인물등용) 게임 메인 컴포넌트
  책임: 5단계 확인형 행적 해금 게임 플로우 관리 (6명 현자)
    - Stage 1 (행적 1): 콘텐츠 1개 — 시작 시 무료
    - Stage 2 (행적 2): 콘텐츠 2개째 — 확인 1회로 해금
    - Stage 3 (행적 3): 콘텐츠 3개째 — 확인 2회로 해금
    - Stage 4 (행적 4): 콘텐츠 4개째 — 확인 3회로 해금
    - Stage 5 (감상 여정): 감상 여정 — 확인 4회로 해금
*/
"use client";

import { useState, useCallback, useEffect, useMemo, type MutableRefObject } from "react";
import { BookOpen, Brain, Lock, ShieldCheck, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { getTrackerRound, type TrackerRound } from "@/actions/game/getTrackerRound";
import { cn } from "@/lib/utils";
import ContentReveal from "./tracker/ContentReveal";
import CulturalJourneyReveal from "./tracker/CulturalJourneyReveal";
import MultipleChoice from "./tracker/MultipleChoice";
import TrackerResult from "./tracker/TrackerResult";

import { useDialogue, useDialogueSubtitle, type DialogueSubtitleData, type DialogueCharacterMeta } from "./shared/hooks/useDialogue";
import type { DialogueType, SpeechTone } from "@/lib/game/voice/types";


type GameStage = "idle" | "loading" | "stage1" | "stage2" | "stage3" | "stage4" | "stage5" | "result";

function StageContent({
  viewStage,
  contents,
  emptyFirstLabel,
  emptyAdditionalLabel,
}: {
  viewStage: string;
  contents: TrackerRound["contents"];
  emptyFirstLabel: string;
  emptyAdditionalLabel: string;
}) {
  const idx = parseInt(viewStage.replace("stage", "")) - 1;
  const content = contents[idx];
  if (!content) {
    return (
      <div className="flex items-center justify-center py-12 text-text-secondary text-sm font-serif bg-black/20 rounded-xl border border-white/5">
        {idx === 0 ? emptyFirstLabel : emptyAdditionalLabel}
      </div>
    );
  }
  return <ContentReveal content={content} />;
}

interface TrackerGameProps {
  onEnterFullScreen?: () => void;
  onHomeRef?: MutableRefObject<(() => void) | null>;
  onPhaseChange?: (phase: string) => void;
  onStartRef?: MutableRefObject<((excludeIds?: string[]) => void) | null>;
}

export default function TrackerGame({ onEnterFullScreen, onHomeRef, onPhaseChange, onStartRef }: TrackerGameProps = {}) {
  const tGame = useTranslations("rest.arena.labyrinth.game");
  const [stage, setStage] = useState<GameStage>("idle");
  const [round, setRound] = useState<TrackerRound | null>(null);
  const [eliminatedIds, setEliminatedIds] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [viewStage, setViewStage] = useState<GameStage>("stage1");
  const [eliminateToast, setEliminateToast] = useState<string | null>(null);
  const [pendingClue, setPendingClue] = useState(false);
  const { handleSubtitle: setSubtitle } = useDialogueSubtitle();
  const sfxMutedRef = useRef(false);

  const personalDialogues = useMemo(() => {
    if (!round) return new Map();
    const map = new Map();
    round.options.forEach((opt) => {
      if (opt.dialogueLines) {
        map.set(opt.id, opt.dialogueLines);
      }
    });
    return map;
  }, [round]);

  // 음성 보유 인물 Set + 버전 Map
  const voiceCelebIds = useMemo(() => {
    if (!round) return new Set<string>();
    const set = new Set<string>();
    round.options.forEach((opt) => {
      if (opt.hasVoice) set.add(opt.id);
    });
    return set;
  }, [round]);

  const voiceVersions = useMemo(() => {
    if (!round) return new Map<string, number>();
    const map = new Map<string, number>();
    round.options.forEach((opt) => {
      if (opt.hasVoice && opt.voiceV) map.set(opt.id, opt.voiceV);
    });
    return map;
  }, [round]);

  const voiceSpeeds = useMemo(() => {
    if (!round) return new Map<string, number>();
    const map = new Map<string, number>();
    round.options.forEach((opt) => {
      if (opt.voiceSpeed && opt.voiceSpeed !== 1.0) map.set(opt.id, opt.voiceSpeed);
    });
    return map;
  }, [round]);

  const { showDialogue, showDefaultLine } = useDialogue({
    sfxMutedRef,
    onSubtitle: setSubtitle,
    personalDialogues,
    voiceCelebIds,
    voiceVersions,
    voiceSpeeds,
  });

  const hintStages = useMemo(() => ([
    { key: "stage1", label: tGame("stages.stage1"), icon: Search },
    { key: "stage2", label: tGame("stages.stage2"), icon: Search },
    { key: "stage3", label: tGame("stages.stage3"), icon: BookOpen },
    { key: "stage4", label: tGame("stages.stage4"), icon: BookOpen },
    { key: "stage5", label: tGame("stages.stage5"), icon: Brain },
  ] as const), [tGame]);

  // 해금: stage1 무료, stage2=확인1회, ... stage5=확인4회
  const unlockedIndex = useMemo(() => {
    return Math.min(eliminatedIds.length, 4);
  }, [eliminatedIds]);

  // stage 진행 시 viewStage 동기화 (pendingClue 중에는 보류)
  useEffect(() => {
    if (!pendingClue && (stage === "stage1" || stage === "stage2" || stage === "stage3" || stage === "stage4" || stage === "stage5")) {
      setViewStage(stage);
    }
  }, [stage, pendingClue]);

  useEffect(() => {
    if (stage === "result") {
      onPhaseChange?.(correct ? "result-win" : "result-lose");
    } else {
      onPhaseChange?.(stage);
    }
  }, [stage, correct, onPhaseChange]);

  const startRound = useCallback(async (excludeIds: string[] = []) => {
    try {
      setStage("loading");
      setEliminatedIds([]);
      setEliminateToast(null);
      setPendingClue(false);
      setSolved(false);
      setCorrect(false);
      const data = await getTrackerRound(excludeIds);
      if (!data) { console.error("[TrackerGame] 라운드 데이터 없음"); setStage("idle"); return; }
      setRound(data);
      setSubtitle(null);
      setStage("stage1");
    } catch (err) {
      console.error("[TrackerGame] startRound 실패:", err);
      setStage("idle");
    }
  }, []);

  const goToResult = useCallback(() => setStage("result"), []);

  // 확인 핸들러 — 결과 대사만 표시
  const handleEliminate = useCallback(
    (id: string) => {
      if (!round || solved) return;
      const target = round.options.find(o => o.id === id);
      const tone = (target?.speechTone as SpeechTone) || "composed";

      if (id === round.celebId) {
        // 정답 확인 → 찾던 인물 종적 감춤 (battle_win = 현자가 도주 성공)
        setCorrect(false);
        setSolved(true);
        const correctOpt = round.options.find(o => o.id === round.celebId);
        if (correctOpt) {
          showDialogue(correctOpt.id, (correctOpt.speechTone as SpeechTone) || "composed", "battle_win", {
            nickname: correctOpt.nickname,
            avatarUrl: correctOpt.avatarUrl,
          });
        }
        return;
      }

      // 일반 확인 → 이 분이 아님 확인
      const newEliminated = [...eliminatedIds, id];
      setEliminatedIds(newEliminated);
      setEliminateToast(target?.nickname ?? tGame("fallbackSage"));
      setTimeout(() => setEliminateToast(null), 1500);
      if (newEliminated.length <= 4) setPendingClue(true);
      if (newEliminated.length === 1) setStage("stage2");
      else if (newEliminated.length === 2) setStage("stage3");
      else if (newEliminated.length === 3) setStage("stage4");
      else if (newEliminated.length === 4) setStage("stage5");

      if (target) {
        showDefaultLine(tone, "cleared", {
          nickname: target.nickname,
          avatarUrl: target.avatarUrl,
        });
      }
    },
    [round, solved, eliminatedIds, showDialogue, showDefaultLine, tGame]
  );

  // 등용 핸들러 — 등용 성공: recruited(범용), 등용 실패: battle_win(개인 대사)
  const handleChoiceSelect = useCallback(
    (selectedId: string) => {
      if (!round) return;
      const isCorrect = selectedId === round.celebId;
      setCorrect(isCorrect);
      setSolved(true);

      const correctOption = round.options.find(o => o.id === round.celebId);
      if (correctOption) {
        const tone = (correctOption.speechTone as SpeechTone) || "composed";
        const meta = { nickname: correctOption.nickname, avatarUrl: correctOption.avatarUrl };
        if (isCorrect) {
          showDefaultLine(tone, "recruited", meta);
        } else {
          showDialogue(correctOption.id, tone, "battle_win", meta);
        }
      }
    },
    [round, showDialogue, showDefaultLine]
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

  const canEliminate = !solved;

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
          <p className="text-sm text-text-secondary font-serif">{tGame("loading")}</p>
        </div>
      </div>
    );
  }

  if (stage === "idle") return null;
  if (!round) return null;

  return (
    <div className="w-full relative flex-1 flex flex-col">
      {/* 확인 완료 토스트 */}
      {eliminateToast && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 pointer-events-none z-50 animate-score-float">
          <div className="flex items-center gap-2 rounded-xl bg-[#0f1a14] border border-green-500/40 px-5 py-3 shadow-lg shadow-green-500/10">
            <ShieldCheck size={20} className="text-green-400 shrink-0" />
            <span className="text-sm font-serif font-bold text-green-400">
              {tGame("confirmedToast", { name: eliminateToast })}
            </span>
          </div>
        </div>
      )}


      {/* 중앙 콘텐츠 */}
      <div className="flex-1 flex items-center justify-center p-4">
        {stage !== "result" && (
          <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 lg:gap-12 pb-4 items-center justify-center">
            
            {/* ── 좌측 패널: 단서 영역 ── */}
            <div className="flex flex-col w-full max-w-lg lg:w-1/2 flex-shrink-0 animate-slide-from-left">
              {/* ── 질문 ── */}
              <p className="text-center lg:text-left text-sm font-serif text-text-secondary mb-4 lg:pl-1">
                {tGame("prompt")}
              </p>

              {/* ── 단계 표시기 ── */}
              <div className="flex items-center justify-center lg:justify-start gap-2 md:gap-3 mb-6 px-1">
                {hintStages.map((hs, i) => {
                  const isUnlocked = i <= unlockedIndex;
                  const isViewing = viewStage === hs.key;
                  const isCurrent = i === unlockedIndex;
                  const Icon = hs.icon;
                  return (
                    <button
                      key={hs.key}
                      onClick={() => isUnlocked && !pendingClue && setViewStage(hs.key as GameStage)}
                      disabled={!isUnlocked || pendingClue}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-1.5 w-16 md:w-20 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200",
                        isViewing
                          ? "text-accent bg-[#1a1710] border border-accent/40 shadow-[0_0_15px_rgba(234,179,8,0.15)] ring-1 ring-accent/20"
                          : isUnlocked
                            ? "text-text-secondary hover:text-white hover:bg-[#1f1d1a] border border-white/5 bg-black/20"
                            : "text-white/20 cursor-default border border-transparent opacity-50",
                        isCurrent && !isViewing && isUnlocked && "text-text-primary animate-pulse"
                      )}
                    >
                      {isUnlocked ? <Icon size={20} className={isViewing ? "drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" : ""} /> : <Lock size={16} className="opacity-40" />}
                      <span className="tracking-wide">{hs.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* ── 힌트 콘텐츠 ── */}
              <div className="px-1 w-full">
                {pendingClue ? (
                  /* 배제 성공 → 유저 클릭 유도 인터스티셜 */
                  <div className="flex flex-col items-center justify-center gap-5 py-14 rounded-xl border border-accent/20 bg-[#12100e] animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 text-accent">
                      <ShieldCheck size={22} className="drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                      <span className="text-sm font-serif font-semibold tracking-wide">
                        {tGame("clueUnlocked")}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setPendingClue(false);
                        setViewStage(stage);
                      }}
                      className="px-8 py-3 rounded-xl text-sm tracking-widest font-bold font-serif bg-accent/10 text-accent hover:bg-accent/20 border border-accent/30 active:scale-95 transition-all"
                    >
                      {tGame("revealClue")}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Stage 1~4: 콘텐츠 단서 (각 탭이 1개씩 표시) */}
                    {(viewStage === "stage1" || viewStage === "stage2" || viewStage === "stage3" || viewStage === "stage4") && (
                      <StageContent
                        viewStage={viewStage}
                        contents={round.contents}
                        emptyFirstLabel={tGame("emptyFirstTrace")}
                        emptyAdditionalLabel={tGame("emptyAdditionalTrace")}
                      />
                    )}
                    {/* Stage 5: 감상 여정 */}
                    {viewStage === "stage5" && (
                      <div className="w-full">
                        {round.culturalJourney ? (
                          <CulturalJourneyReveal culturalJourney={round.culturalJourney} />
                        ) : (
                          <div className="flex items-center justify-center py-12 text-text-secondary text-sm font-serif bg-black/20 rounded-xl border border-white/5">
                            {tGame("emptyFirstTrace")}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── 우측 패널: 인물 선택 영역 ── */}
            <div className="flex flex-col w-full max-w-lg lg:w-1/2 flex-shrink-0 lg:pt-8 animate-slide-from-right">
              {!solved && (
                <div className="pb-2">
                  <p className="text-center lg:text-left text-xs text-text-tertiary mb-6 tracking-widest font-serif lg:pl-2">
                    {tGame("selectionHint")}
                  </p>
                  <div className="-ml-1 lg:ml-0">
                    <MultipleChoice
                      key={round.celebId}
                      options={round.options}
                      correctId={round.celebId}
                      eliminatedIds={eliminatedIds}
                      canEliminate={canEliminate}
                      onSelect={handleChoiceSelect}
                      onEliminate={handleEliminate}
                      onCardClick={(id) => {
                        const opt = round.options.find(o => o.id === id);
                        if (opt) {
                          showDialogue(opt.id, (opt.speechTone as SpeechTone) || "composed", "greeting", {
                            nickname: opt.nickname,
                            avatarUrl: opt.avatarUrl,
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              )}
              {solved && (
                <div className="w-full max-w-sm mx-auto lg:mx-0 pt-3 space-y-4 animate-in fade-in zoom-in-95">
                  <p className={cn(
                    "text-center text-sm font-serif leading-relaxed py-4",
                    correct ? "text-accent" : "text-red-400/80"
                  )}>
                    {correct
                      ? tGame("recruited", { name: round.nickname })
                      : tGame("escaped", { name: round.nickname })
                    }
                  </p>
                  <button
                    onClick={goToResult}
                    className="w-full h-12 rounded-xl text-[15px] tracking-widest font-bold font-serif bg-[#1a1710] text-accent hover:bg-[#231f15] border border-accent/30 active:scale-95 transition-all"
                  >
                    {tGame("viewResult")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {stage === "result" && (
          <div className="max-w-lg w-full flex flex-col pb-4 animate-in fade-in zoom-in-95 duration-300">
            <TrackerResult
              celebId={round.celebId}
              celebSlug={round.celebSlug}
              nickname={round.nickname}
              profession={round.profession}
              avatarUrl={round.avatarUrl}
              correct={correct}
              contents={round.contents}
              options={round.options}
              onNext={handleNext}
              onQuit={handleQuit}
              showDialogue={showDialogue}
            />
          </div>
        )}
      </div>

    </div>
  );
}
