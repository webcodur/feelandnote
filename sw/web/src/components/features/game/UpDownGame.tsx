/*
  파일명: components/features/game/UpDownGame.tsx
  기능: 업다운 게임 메인 컴포넌트
  매커닉: 매 라운드 새 2장, 영향력 더 높은 인물 선택
*/
"use client";

import { useState, useEffect, useCallback } from "react";
import { getCelebs } from "@/actions/home/getCelebs";
import type { CelebProfile } from "@/types/home";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";
import { Button } from "@/components/ui";
import { Info } from "lucide-react";
import { isPublicDomainCeleb, PUBLIC_DOMAIN_NOTICE } from "./utils";
import GameHeader from "./GameHeader";
import ArenaCard from "./ArenaCard";
import { cn } from "@/lib/utils";

type GameState = "idle" | "playing" | "thinking" | "revealing" | "gameover";
type Difficulty = "easy" | "hard";

export default function UpDownGame() {
  const [celebs, setCelebs] = useState<CelebProfile[]>([]);
  const [leftCeleb, setLeftCeleb] = useState<CelebProfile | null>(null);
  const [rightCeleb, setRightCeleb] = useState<CelebProfile | null>(null);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCeleb, setSelectedCeleb] = useState<CelebProfile | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isFading, setIsFading] = useState(false);

  const isNewRecord = streak === highScore && streak > 0;

  // region: 데이터 로드
  useEffect(() => {
    const loadCelebs = async () => {
      const result = await getCelebs({ limit: 200, sortBy: "influence" });
      const filtered = result.celebs.filter(
        (c) => c.influence?.total_score && isPublicDomainCeleb(c.death_date ?? null)
      );
      setCelebs(filtered);
      setIsDataLoaded(true);

      const saved = localStorage.getItem("up-down-highscore");
      if (saved) setHighScore(parseInt(saved, 10));
    };
    loadCelebs();
  }, []);
  // endregion

  // region: 유틸
  const pickTwoCelebs = useCallback(() => {
    const shuffled = [...celebs].sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1]] as const;
  }, [celebs]);

  const getScore = (celeb: CelebProfile) => celeb.influence?.total_score ?? 0;
  // endregion

  // region: 게임 초기화
  const startGame = useCallback(
    (selectedDifficulty: Difficulty) => {
      if (celebs.length < 2) return;
      setDifficulty(selectedDifficulty);

      const [first, second] = pickTwoCelebs();
      setLeftCeleb(first);
      setRightCeleb(second);
      setStreak(0);
      setIsCorrect(null);
      setSelectedId(null);
      setGameState("playing");
    },
    [celebs, pickTwoCelebs]
  );
  // endregion

  // region: 카드 선택 → 판정
  const handleSelect = (celeb: CelebProfile) => {
    if (!leftCeleb || !rightCeleb || gameState !== "playing") return;

    setSelectedId(celeb.id);
    setGameState("thinking");

    setTimeout(() => {
      const leftScore = getScore(leftCeleb);
      const rightScore = getScore(rightCeleb);

      // 동점이면 무조건 정답
      const higherId = leftScore === rightScore
        ? celeb.id
        : leftScore > rightScore ? leftCeleb.id : rightCeleb.id;

      const correct = celeb.id === higherId;
      setIsCorrect(correct);
      setGameState("revealing");

      if (correct) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > highScore) {
          setHighScore(newStreak);
          localStorage.setItem("up-down-highscore", newStreak.toString());
        }
      }
    }, 1500);
  };
  // endregion

  // region: 정답 시 자동 진행
  useEffect(() => {
    if (gameState !== "revealing" || !isCorrect) return;

    const timer = setTimeout(() => {
      advanceRound();
    }, 1200);
    return () => clearTimeout(timer);
  }, [gameState, isCorrect]);

  const advanceRound = () => {
    setIsFading(true);

    setTimeout(() => {
      const [first, second] = pickTwoCelebs();
      setLeftCeleb(first);
      setRightCeleb(second);
      setIsCorrect(null);
      setSelectedId(null);
      setGameState("playing");
      setIsFading(false);
    }, 300);
  };
  // endregion

  // region: 오답 → 바로 게임오버
  useEffect(() => {
    if (gameState !== "revealing" || isCorrect !== false) return;

    const timer = setTimeout(() => {
      setGameState("gameover");
    }, 1500);
    return () => clearTimeout(timer);
  }, [gameState, isCorrect]);
  // endregion

  // region: 렌더링
  if (!isDataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-pulse text-text-secondary font-serif">쉼터 입장 중...</div>
      </div>
    );
  }

  if (gameState === "idle") {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center text-center">
        <div className="w-full max-w-sm bg-bg-card border border-border rounded-xl p-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="space-y-2">
               <h3 className="text-lg font-bold text-white font-serif">게임 규칙</h3>
               <p className="text-sm text-text-secondary leading-relaxed">
                 두 인물 중 영향력이<br/>
                 <strong className="text-accent">더 높은 인물</strong>을 선택하세요.
               </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => startGame("easy")}
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent/50 transition-all active:scale-95"
              >
                <div className="font-bold text-white font-serif text-lg">초급</div>
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider mt-1">정보 공개</span>
              </button>
              <button
                onClick={() => startGame("hard")}
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent/50 transition-all active:scale-95"
              >
                <div className="font-bold text-white font-serif text-lg">고급</div>
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider mt-1">정보 제한</span>
              </button>
            </div>

            {highScore > 0 && (
              <div className="pt-4 mt-4 border-t border-white/10">
                <p className="text-xs text-text-tertiary font-cinzel uppercase">최고 기록</p>
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

  if (!leftCeleb || !rightCeleb) return null;

  const isHardMode = difficulty === "hard";
  const isPlaying = gameState === "playing";
  const isRevealing = gameState === "revealing";
  const isThinking = gameState === "thinking";
  const isGameOver = gameState === "gameover";

  const getCardStatus = (celeb: CelebProfile): "normal" | "win" | "lose" | "selected" => {
    if (isGameOver && selectedId === celeb.id) return "lose";
    if (!isRevealing) return selectedId === celeb.id ? "selected" : "normal";
    if (selectedId === celeb.id) return isCorrect ? "win" : "lose";
    return "normal";
  };

  return (
    <div className={cn(
      "max-w-4xl mx-auto flex flex-col min-h-[500px] md:min-h-[600px] justify-between pb-4 md:pb-8 relative",
      isFading && "opacity-0"
    )} style={{ transition: "opacity 300ms ease" }}>
      {/* Game Header */}
      <GameHeader
        difficulty={difficulty}
        difficultyLabel={isHardMode ? "고급" : "초급"}
        streak={streak}
        highScore={highScore}
        onBack={() => setGameState("idle")}
        className="mb-2 md:mb-8"
      />

      {/* Battle Arena */}
      <div className="flex-1 relative flex flex-col md:flex-row items-center justify-center gap-1 md:gap-12 px-2 md:px-4 py-1 md:py-2">

        {/* Background Atmosphere */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none" />

        {/* VS Badge */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex items-center justify-center w-12 h-12 md:w-20 md:h-20 rounded-full bg-bg-main border-2 border-accent shadow-[0_0_20px_rgba(212,175,55,0.4)] md:shadow-[0_0_40px_rgba(212,175,55,0.5)]">
           <span className="font-cinzel font-black text-accent text-lg md:text-2xl drop-shadow-md pt-1">VS</span>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-2 gap-2 md:flex md:gap-12 w-full md:w-auto relative z-10 justify-center">

          {/* Left Card */}
          <div className="w-full md:w-[320px] aspect-[2/3]">
            <ArenaCard
              imageUrl={leftCeleb.portrait_url ?? leftCeleb.avatar_url}
              name={leftCeleb.nickname}
              title={leftCeleb.profession}
              subText={(isRevealing || isGameOver) ? getScore(leftCeleb).toLocaleString() : "???"}
              subTextLabel="영향력"
              isRevealed={isRevealing || isGameOver}
              status={getCardStatus(leftCeleb)}
              className="w-full h-full"
              onClick={isPlaying ? () => handleSelect(leftCeleb) : undefined}
              onInfoClick={isHardMode ? undefined : () => setSelectedCeleb(leftCeleb)}
            />
          </div>

          {/* Right Card */}
          <div className="w-full md:w-[320px] aspect-[2/3]">
            <ArenaCard
              imageUrl={rightCeleb.portrait_url ?? rightCeleb.avatar_url}
              name={rightCeleb.nickname}
              title={rightCeleb.profession}
              subText={(isRevealing || isGameOver) ? getScore(rightCeleb).toLocaleString() : "???"}
              subTextLabel="영향력"
              isRevealed={isRevealing || isGameOver}
              status={getCardStatus(rightCeleb)}
              className="w-full h-full"
              onClick={isPlaying ? () => handleSelect(rightCeleb) : undefined}
              onInfoClick={isHardMode ? undefined : () => setSelectedCeleb(rightCeleb)}
            />
          </div>
        </div>
      </div>

      {/* Interaction Area */}
      <div className="mt-2 md:mt-4 flex flex-col items-center justify-center min-h-[60px] z-30">

        {/* 대기 */}
        {isPlaying && (
          <p className="text-text-secondary text-sm md:text-base font-cinzel animate-in fade-in duration-300">
            영향력이 더 높은 인물을 선택하세요
          </p>
        )}

        {/* 서스펜스 */}
        {isThinking && (
           <div className="flex flex-col items-center animate-pulse">
              <p className="text-xl font-serif text-accent mb-2">판정 중...</p>
              <div className="flex gap-1.5">
                 <div className="w-2 h-2 rounded-full bg-accent animate-bounce delay-0" />
                 <div className="w-2 h-2 rounded-full bg-accent animate-bounce delay-150" />
                 <div className="w-2 h-2 rounded-full bg-accent animate-bounce delay-300" />
              </div>
           </div>
        )}

        {/* 게임오버 */}
        {isGameOver && (
          <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
            {isNewRecord && (
              <span className="text-xs text-accent font-bold">신기록 달성!</span>
            )}
            <Button
              size="lg"
              onClick={() => setGameState("idle")}
              className="min-w-[160px] h-12 font-serif font-bold rounded-xl active:scale-95 bg-white/10 text-white hover:bg-white/20 border border-white/20 animate-pulse shadow-[0_0_20px_rgba(255,255,255,0.15),0_0_40px_rgba(212,175,55,0.1)]"
            >
              다시 하기
            </Button>
          </div>
        )}
      </div>

      {selectedCeleb && (
        <CelebDetailModal
          celeb={selectedCeleb}
          isOpen={!!selectedCeleb}
          onClose={() => setSelectedCeleb(null)}
          hideInfluence
        />
      )}
    </div>
  );
}
