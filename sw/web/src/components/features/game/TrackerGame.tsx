/*
  파일명: components/features/game/TrackerGame.tsx
  기능: 인물추적 게임 메인 컴포넌트
  책임: 6단계 게임 플로우 관리 (스탯→콘텐츠→철학→소개→명언→객관식→결과)
*/
"use client";

import { Fragment, useState, useCallback, useEffect, useRef } from "react";
import { Info, Crosshair, CheckCircle, Flame } from "lucide-react";
import { getTrackerRound, type TrackerRound } from "@/actions/game/getTrackerRound";
import { getTrackerCelebNames, type TrackerCelebName } from "@/actions/game/getTrackerCelebNames";
import { cn } from "@/lib/utils";
import { PUBLIC_DOMAIN_NOTICE } from "./utils";
import StatReveal from "./tracker/StatReveal";
import ContentReveal from "./tracker/ContentReveal";
import PhilosophyReveal from "./tracker/PhilosophyReveal";
import BioReveal from "./tracker/BioReveal";
import QuotesReveal from "./tracker/QuotesReveal";
import MultipleChoice from "./tracker/MultipleChoice";
import TrackerResult from "./tracker/TrackerResult";
import GuessInput from "./tracker/GuessInput";
import TrackerTimer from "./tracker/TrackerTimer";

type GameStage = "idle" | "loading" | "stat" | "content" | "philosophy" | "bio" | "quotes" | "choice" | "result";

const STAGE_SCORES: Record<string, number> = {
  stat: 6, content: 5, philosophy: 4, bio: 3, quotes: 2, choice: 1,
};

const STAGE_TIME: Record<string, number> = {
  stat: 30, content: 25, philosophy: 20, bio: 15, quotes: 12, choice: 15,
};

const HIGHSCORE_KEY = "tracker-highscore";
const GUESS_STAGES: GameStage[] = ["stat", "content", "philosophy", "bio", "quotes"];
const ALL_STAGES: GameStage[] = ["stat", "content", "philosophy", "bio", "quotes", "choice"];

function matchNickname(guess: string, nickname: string): boolean {
  const g = guess.trim().toLowerCase();
  const n = nickname.trim().toLowerCase();
  if (g === n) return true;
  return n.split(/\s+/).filter((t) => t.length >= 2).some((t) => t === g);
}

export default function TrackerGame() {
  const [stage, setStage] = useState<GameStage>("idle");
  const [round, setRound] = useState<TrackerRound | null>(null);
  const [contentIndex, setContentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [solved, setSolved] = useState(false);
  const [showScorePop, setShowScorePop] = useState(false);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [celebNames, setCelebNames] = useState<TrackerCelebName[]>([]);
  const timerKeyRef = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem(HIGHSCORE_KEY);
    if (saved) setHighScore(parseInt(saved, 10));
    getTrackerCelebNames().then(setCelebNames);
  }, []);

  const updateHighScore = useCallback(
    (newTotal: number) => {
      if (newTotal > highScore) {
        setHighScore(newTotal);
        setIsNewRecord(true);
        localStorage.setItem(HIGHSCORE_KEY, newTotal.toString());
      } else {
        setIsNewRecord(false);
      }
    },
    [highScore]
  );

  const startRound = useCallback(async (excludeIds: string[] = []) => {
    setStage("loading");
    setContentIndex(0);
    setScore(0);
    setSolved(false);
    setShowScorePop(false);
    setIsNewRecord(false);
    timerKeyRef.current += 1;

    const data = await getTrackerRound(excludeIds);
    if (!data) { setStage("idle"); return; }
    setRound(data);
    setStage("stat");
  }, []);

  const handleCorrect = useCallback(
    (stageKey: string) => {
      const earned = STAGE_SCORES[stageKey] ?? 0;
      const newTotal = totalScore + earned;
      setScore(earned);
      setTotalScore(newTotal);
      setStreak((s) => s + 1);
      updateHighScore(newTotal);
      setSolved(true);
      setShowScorePop(true);
      setTimeout(() => setShowScorePop(false), 1500);
    },
    [totalScore, updateHighScore]
  );

  const goToResult = useCallback(() => setStage("result"), []);

  // region: 다음 스테이지 결정
  const getNextStage = useCallback(
    (current: GameStage): GameStage => {
      if (!round) return "choice";
      const idx = ALL_STAGES.indexOf(current);
      for (let i = idx + 1; i < ALL_STAGES.length; i++) {
        const next = ALL_STAGES[i];
        if (next === "content" && round.contents.length === 0) continue;
        if (next === "philosophy" && !round.consumptionPhilosophy) continue;
        if (next === "bio" && !round.bio) continue;
        if (next === "quotes" && !round.quotes) continue;
        return next;
      }
      return "choice";
    },
    [round]
  );

  const advanceStage = useCallback((next: GameStage) => {
    if (next === "content") setContentIndex(1);
    timerKeyRef.current += 1;
    setStage(next);
  }, []);

  // region: 패스
  const handlePass = useCallback(() => {
    if (stage === "content" && round) {
      const max = Math.min(round.contents.length, 5);
      if (contentIndex < max) { setContentIndex((p) => p + 1); return; }
    }
    advanceStage(getNextStage(stage));
  }, [stage, round, contentIndex, getNextStage, advanceStage]);

  // region: 타이머 만료
  const handleTimeout = useCallback(() => {
    if (solved) return;
    if (stage === "choice") {
      setScore(0);
      setStreak(0);
      setSolved(true);
    } else {
      advanceStage(getNextStage(stage));
    }
  }, [solved, stage, getNextStage, advanceStage]);

  // region: 주관식 제출
  const handleGuess = useCallback(
    (guess: string): boolean => {
      if (!round) return false;
      if (matchNickname(guess, round.nickname)) {
        handleCorrect(stage);
        return true;
      }
      if (stage === "content") {
        const max = Math.min(round.contents.length, 5);
        if (contentIndex < max) setContentIndex((p) => p + 1);
      }
      return false;
    },
    [round, stage, contentIndex, handleCorrect]
  );

  // region: 객관식
  const handleChoiceSelect = useCallback(
    (selectedId: string) => {
      if (!round) return;
      if (selectedId === round.celebId) {
        handleCorrect("choice");
      } else {
        setScore(0);
        setStreak(0);
        setSolved(true);
      }
    },
    [round, handleCorrect]
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
    setTotalScore(0);
    setStreak(0);
  }, []);

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

  // region: Idle
  if (stage === "idle") {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center text-center">
        <div className="w-full max-w-sm bg-bg-card border border-border rounded-xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
          <div className="space-y-4 relative z-10">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white font-serif">게임 규칙</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                단서를 보고 <strong className="text-accent">누구인지</strong> 맞춰보세요.
                <br />
                빠르게 맞출수록 높은 점수!
              </p>
            </div>
            <div className="grid grid-cols-6 gap-1 text-center text-[10px]">
              {[
                { s: "스탯", p: "6점" }, { s: "콘텐츠", p: "5점" }, { s: "철학", p: "4점" },
                { s: "소개", p: "3점" }, { s: "명언", p: "2점" }, { s: "객관식", p: "1점" },
              ].map((item) => (
                <div key={item.s} className="rounded bg-white/5 border border-white/10 py-1.5 px-1">
                  <div className="text-text-tertiary">{item.s}</div>
                  <div className="font-bold text-accent text-xs">{item.p}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => startRound()}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-lg bg-accent/10 border border-accent/30 hover:bg-accent/20 active:scale-95"
            >
              <Crosshair size={20} className="text-accent" />
              <span className="font-bold text-white font-serif text-lg">추적 시작</span>
            </button>
            {highScore > 0 && (
              <div className="pt-4 mt-4 border-t border-white/10">
                <p className="text-xs text-text-tertiary font-cinzel uppercase">최고 점수</p>
                <p className="text-2xl font-black text-accent">{highScore}</p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-8 flex items-center gap-2 px-4 py-2 rounded-full bg-accent/5 border border-accent/10">
          <Info size={14} className="text-accent" />
          <span className="text-xs text-text-tertiary">{PUBLIC_DOMAIN_NOTICE}</span>
        </div>
      </div>
    );
  }

  if (!round) return null;

  const isGuessStage = GUESS_STAGES.includes(stage);
  const currentIdx = ALL_STAGES.indexOf(stage);
  const stageTime = STAGE_TIME[stage];

  const getPassLabel = (): string => {
    if (stage === "quotes") return "객관식으로";
    if (stage === "bio") return round.quotes ? "명언 보기" : "객관식으로";
    if (stage === "philosophy") return round.bio ? "소개 보기" : round.quotes ? "명언 보기" : "객관식으로";
    return "다음 단서";
  };

  const stageNum: Record<string, string> = {
    stat: "1", content: "2", philosophy: "3", bio: "4", quotes: "5", choice: "6", result: "끝",
  };

  // region: 게임 진행
  return (
    <div className="max-w-2xl md:max-w-4xl mx-auto flex flex-col pb-4 md:pb-8 relative">
      {/* 점수 팝업 */}
      {showScorePop && score > 0 && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 pointer-events-none z-50 animate-score-float">
          <span className="text-5xl font-black font-serif text-accent drop-shadow-[0_0_20px_rgba(212,175,55,0.6)]">
            +{score}
          </span>
        </div>
      )}

      {/* HUD */}
      <div className="relative w-full h-10 md:h-14 px-2 md:px-0 flex items-center justify-center mb-2 md:mb-4">
        <div className="absolute left-2 md:left-0">
          <button
            onClick={handleQuit}
            className="flex items-center justify-center w-7 h-7 md:w-10 md:h-10 rounded-full border border-white/10 bg-black/40 hover:bg-white/10 hover:border-accent/50 text-text-secondary hover:text-white"
          >
            <span className="text-xs md:text-sm">&#x2715;</span>
          </button>
        </div>
        <div className="flex items-center gap-6 md:gap-12 px-5 md:px-10 py-2 md:py-3 rounded-full border border-white/10 bg-black/40 backdrop-blur-md shadow-xl">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] md:text-xs text-text-tertiary font-cinzel tracking-wider uppercase">단계</span>
            <span className="text-lg md:text-2xl font-serif font-black text-white leading-none">
              {stageNum[stage] ?? ""}
            </span>
          </div>
          <div className="h-8 md:h-10 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] md:text-xs text-text-tertiary font-cinzel tracking-wider uppercase">점수</span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg md:text-2xl font-serif font-black text-white leading-none">{totalScore}</span>
              <span className="text-sm md:text-lg font-serif font-medium text-text-secondary">/</span>
              <span className="text-lg md:text-2xl font-serif font-black text-accent leading-none">{highScore}</span>
            </div>
          </div>
          <div className="h-8 md:h-10 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] md:text-xs text-text-tertiary font-cinzel tracking-wider uppercase">연승</span>
            <div className="flex items-center gap-0.5">
              {streak >= 2 && <Flame size={14} className="text-orange-400" />}
              <span className={cn(
                "text-lg md:text-2xl font-serif font-black leading-none",
                streak >= 2 ? "text-orange-400" : "text-white"
              )}>
                {streak}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 스테이지 진행 바 */}
      <div className="flex items-center justify-center gap-0 mb-2 px-8 max-w-xs mx-auto">
        {ALL_STAGES.map((s, i) => {
          const passed = currentIdx > i || stage === "result";
          const active = currentIdx === i && stage !== "result";
          return (
            <Fragment key={s}>
              {i > 0 && <div className={cn("h-px flex-1", passed ? "bg-accent/50" : "bg-white/10")} />}
              <div className={cn(
                "w-3 h-3 rounded-full border-2 shrink-0",
                passed && "bg-accent border-accent",
                active && "bg-accent border-accent shadow-[0_0_8px_rgba(212,175,55,0.5)]",
                !passed && !active && "bg-transparent border-white/20"
              )} />
            </Fragment>
          );
        })}
      </div>

      {/* 타이머 */}
      {stageTime && !solved && stage !== "result" && (
        <div className="max-w-lg mx-auto w-full mb-4 px-4">
          <TrackerTimer key={timerKeyRef.current} duration={stageTime} onExpire={handleTimeout} />
        </div>
      )}

      {/* 누적 힌트 영역 */}
      <div className="space-y-4 mb-6">
        <StatReveal
          persona={round.persona}
          profession={round.profession}
          nationalityLabel={round.nationalityLabel}
          birthDate={round.birthDate}
          deathDate={round.deathDate}
          revealedName={solved ? round.nickname : undefined}
          revealedAvatar={solved ? round.avatarUrl : undefined}
        />

        {currentIdx >= 1 && round.contents.length > 0 && (
          <ContentReveal
            contents={round.contents}
            revealCount={stage === "content" ? contentIndex : Math.min(round.contents.length, 5)}
          />
        )}

        {currentIdx >= 2 && round.consumptionPhilosophy && (
          <PhilosophyReveal philosophy={round.consumptionPhilosophy} />
        )}

        {currentIdx >= 3 && round.bio && <BioReveal bio={round.bio} />}
        {currentIdx >= 4 && round.quotes && <QuotesReveal quotes={round.quotes} />}

        {stage === "choice" && (
          <MultipleChoice options={round.options} correctId={round.celebId} onSelect={handleChoiceSelect} />
        )}
      </div>

      {/* 정답 확인 배너 + 결과 보기 */}
      {solved && stage !== "result" && (
        <div className="w-full max-w-sm mx-auto space-y-3 animate-in fade-in">
          <div className={cn(
            "flex items-center justify-center gap-2 rounded-lg px-4 py-3",
            score > 0
              ? "border border-accent/40 bg-accent/10"
              : "border border-red-500/40 bg-red-500/10"
          )}>
            <CheckCircle size={18} className={score > 0 ? "text-accent" : "text-red-400"} />
            <span className={cn("text-sm font-bold font-serif", score > 0 ? "text-accent" : "text-red-400")}>
              {score > 0 ? `정답! +${score}점` : "오답"}
            </span>
          </div>
          <button
            onClick={goToResult}
            className="w-full h-11 rounded-xl text-sm font-bold font-serif bg-accent/20 text-accent hover:bg-accent/30 border border-accent/30 active:scale-95"
          >
            결과 보기
          </button>
        </div>
      )}

      {/* 주관식 입력 */}
      {isGuessStage && !solved && (
        <GuessInput celebNames={celebNames} onSubmit={handleGuess} onPass={handlePass} passLabel={getPassLabel()} />
      )}

      {/* 결과 */}
      {stage === "result" && (
        <TrackerResult
          celebId={round.celebId}
          nickname={round.nickname}
          profession={round.profession}
          avatarUrl={round.avatarUrl}
          score={score}
          totalScore={totalScore}
          streak={streak}
          isNewRecord={isNewRecord}
          contents={round.contents}
          onNext={handleNext}
          onQuit={handleQuit}
        />
      )}
    </div>
  );
}
