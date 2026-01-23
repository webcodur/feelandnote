/*
  파일명: components/features/game/HigherLowerGame.tsx
  기능: Higher or Lower 게임 메인 컴포넌트
  책임: 게임 로직, 상태 관리, UI 렌더링
*/ // ------------------------------

"use client";

import { useState, useEffect, useCallback } from "react";
import { getCelebs } from "@/actions/home/getCelebs";
import type { CelebProfile } from "@/types/home";
import GameCelebCard from "./GameCelebCard";
import GameResultModal from "./GameResultModal";
import CelebInfluenceModal from "@/components/features/home/CelebInfluenceModal";
import { Button } from "@/components/ui";
import { ArrowUp, ArrowDown } from "lucide-react";
import GameHeader from "./GameHeader";

type GameState = "idle" | "loading" | "playing" | "revealing" | "gameover";
type Difficulty = "easy" | "hard";

export default function HigherLowerGame() {
  const [celebs, setCelebs] = useState<CelebProfile[]>([]);
  const [currentCeleb, setCurrentCeleb] = useState<CelebProfile | null>(null);
  const [nextCeleb, setNextCeleb] = useState<CelebProfile | null>(null);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [selectedCelebId, setSelectedCelebId] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // 애니메이션 상태
  const [leftFadeOut, setLeftFadeOut] = useState(false);
  const [showSlider, setShowSlider] = useState(false);
  const [sliderAtLeft, setSliderAtLeft] = useState(false);
  const [rightFadeIn, setRightFadeIn] = useState(false);
  const [pendingNext, setPendingNext] = useState<CelebProfile | null>(null);

  // region: 데이터 로드
  useEffect(() => {
    const loadCelebs = async () => {
      const result = await getCelebs({ limit: 100, sortBy: "influence" });
      const filtered = result.celebs.filter((c) => c.influence?.total_score);
      setCelebs(filtered);
      setIsDataLoaded(true);

      const saved = localStorage.getItem("higher-lower-highscore");
      if (saved) setHighScore(parseInt(saved, 10));
    };
    loadCelebs();
  }, []);

  // region: 게임 초기화
  const pickRandomCeleb = useCallback(
    (exclude?: string) => {
      const available = exclude ? celebs.filter((c) => c.id !== exclude) : celebs;
      return available[Math.floor(Math.random() * available.length)];
    },
    [celebs]
  );

  const startGame = useCallback(
    (selectedDifficulty: Difficulty) => {
      if (celebs.length < 2) return;
      setDifficulty(selectedDifficulty);

      const first = pickRandomCeleb();
      const second = pickRandomCeleb(first.id);

      setCurrentCeleb(first);
      setNextCeleb(second);
      setStreak(0);
      setIsCorrect(null);
      setGameState("playing");
    },
    [celebs, pickRandomCeleb]
  );

  // region: 게임 로직
  const handleChoice = (choice: "higher" | "lower") => {
    if (!currentCeleb || !nextCeleb || gameState !== "playing") return;

    const currentScore = currentCeleb.influence?.total_score ?? 0;
    const nextScore = nextCeleb.influence?.total_score ?? 0;
    const correct =
      choice === "higher" ? nextScore >= currentScore : nextScore <= currentScore;

    setIsCorrect(correct);
    setGameState("revealing");

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > highScore) {
        setHighScore(newStreak);
        localStorage.setItem("higher-lower-highscore", newStreak.toString());
      }
    }
  };

  const handleNext = () => {
    if (!nextCeleb) return;

    if (!isCorrect) {
      setGameState("gameover");
      return;
    }

    const newNext = pickRandomCeleb(nextCeleb.id);
    setPendingNext(newNext);

    // Phase 1: 좌측 fadeout (300ms)
    setLeftFadeOut(true);

    setTimeout(() => {
      // Phase 2: 우측 → 좌측 슬라이드 (300ms)
      setShowSlider(true);
      requestAnimationFrame(() => setSliderAtLeft(true));

      setTimeout(() => {
        // 데이터 스왑
        setCurrentCeleb(nextCeleb);
        setNextCeleb(newNext);
        setShowSlider(false);
        setSliderAtLeft(false);
        setLeftFadeOut(false);

        // Phase 3: 우측 fadein (300ms)
        setRightFadeIn(true);

        setTimeout(() => {
          setRightFadeIn(false);
          setPendingNext(null);
          setGameState("playing");
          setIsCorrect(null);
        }, 300);
      }, 300);
    }, 300);
  };

  // region: 렌더링
  if (!isDataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-text-secondary">로딩 중...</div>
      </div>
    );
  }

  // 게임 시작 화면
  if (gameState === "idle") {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-white font-serif">Higher or Lower</h2>
          <p className="text-sm text-text-secondary mt-2">셀럽 영향력 비교 게임</p>
          <div className="w-24 h-px bg-accent/20 mx-auto mt-6 shadow-glow" />
        </div>

          <div className="bg-white/5 rounded-lg p-4 mb-6 text-sm text-text-secondary space-y-2">
            <p>1. 왼쪽 셀럽의 영향력 점수가 공개됩니다</p>
            <p>2. 오른쪽 셀럽의 점수가 더 높을지, 낮을지 예측하세요</p>
            <p>3. 정답이면 다음 문제, 오답이면 게임 오버!</p>
            <p className="text-text-tertiary">* 카드를 탭하면 영향력 상세를 볼 수 있어요</p>
          </div>

          <p className="text-xs text-text-tertiary text-center mb-2">난이도를 선택하여 게임 시작</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => startGame("easy")}
              className="p-4 bg-white/5 hover:bg-white/10 border border-border hover:border-accent/50 rounded-lg"
            >
              <div className="font-bold text-white">쉬움</div>
              <p className="text-xs text-text-tertiary mt-1">모든 정보 공개</p>
            </button>
            <button
              onClick={() => startGame("hard")}
              className="p-4 bg-white/5 hover:bg-white/10 border border-border hover:border-accent/50 rounded-lg"
            >
              <div className="font-bold text-white">어려움</div>
              <p className="text-xs text-text-tertiary mt-1">이름/정보 숨김</p>
            </button>
          </div>

          {highScore > 0 && (
            <p className="text-center text-sm text-text-secondary">
              나의 최고 기록: <span className="text-accent font-bold">{highScore}</span>
            </p>
          )}
      </div>
    );
  }

  // 게임 진행 중
  if (!currentCeleb || !nextCeleb) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-text-secondary">준비 중...</div>
      </div>
    );
  }

  const isPlaying = gameState === "playing";
  const isRevealing = gameState === "revealing";
  const isHardMode = difficulty === "hard";

  return (
    <div className="max-w-4xl mx-auto">
      {/* 공통 헤더 */}
      <GameHeader
        difficulty={difficulty}
        difficultyLabel={isHardMode ? "고수" : "초보"}
        streak={streak}
        highScore={highScore}
      />

      {/* 게임 보드 */}
      <div className="relative grid grid-cols-2 gap-4 mb-6">
        {/* 좌측 카드 */}
        <div
          className={`flex flex-col gap-3 transition-opacity duration-300 ${
            leftFadeOut ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* 카드 상단 라벨 */}
          <div className="text-center">
            <span className="inline-block px-3 py-1 bg-accent/10 text-accent text-[10px] font-bold tracking-widest uppercase border border-accent/20 rounded-full">
              Comparison
            </span>
            <p className="text-[10px] text-text-tertiary mt-1 font-medium">비교 대상</p>
          </div>

          <GameCelebCard
            celeb={currentCeleb}
            showScore={false}
            isLeft
            onClick={isHardMode ? undefined : () => setSelectedCelebId(currentCeleb.id)}
            clickable={!isHardMode}
            hideInfo={isHardMode}
          />
          {/* 점수 표시 (외부) */}
          <div className="text-center h-8">
            <span className="text-2xl font-black text-accent drop-shadow-sm">
              {currentCeleb.influence?.total_score ?? 0}
            </span>
          </div>
        </div>

        {/* 우측 카드 */}
        <div
          className={`flex flex-col gap-3 transition-opacity duration-300 ${
            showSlider || rightFadeIn ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* 카드 상단 라벨 */}
          <div className="text-center">
            <span className="inline-block px-3 py-1 bg-white/5 text-text-secondary text-[10px] font-bold tracking-widest uppercase border border-white/10 rounded-full">
              Criteria
            </span>
            <p className="text-[10px] text-text-tertiary mt-1 font-medium">판별 기준</p>
          </div>

          <GameCelebCard
            celeb={nextCeleb}
            showScore={false}
            isLeft={false}
            isRevealing={isRevealing}
            isCorrect={isCorrect}
            onClick={isHardMode ? undefined : () => setSelectedCelebId(nextCeleb.id)}
            clickable={!isHardMode && isRevealing}
            hideInfo={isHardMode}
          />
          {/* 점수 표시 (외부) - 정답 공개 시에만 표시 */}
          <div className="text-center h-8">
            {isRevealing ? (
              <span className={`text-2xl font-black drop-shadow-sm ${isCorrect ? "text-green-500" : "text-red-500"}`}>
                {nextCeleb.influence?.total_score ?? 0}
              </span>
            ) : (
              <span className="text-2xl font-black text-text-tertiary">???</span>
            )}
          </div>
        </div>

        {/* 슬라이딩 카드 (우측 → 좌측 이동) */}
        {showSlider && (
          <div
            className={`absolute top-0 end-0 w-[calc(50%-0.5rem)] transition-transform duration-300 ${
              sliderAtLeft ? "-translate-x-[calc(100%+1rem)]" : ""
            }`}
          >
            <div className="flex flex-col gap-3">
              <div className="text-center">
                <span className="inline-block px-3 py-1 bg-accent/10 text-accent text-[10px] font-bold tracking-widest uppercase border border-accent/20 rounded-full">
                  Comparison
                </span>
                <p className="text-[10px] text-text-tertiary mt-1 font-medium">비교 대상</p>
              </div>
              <GameCelebCard
                celeb={nextCeleb}
                showScore={false}
                isLeft
                hideInfo={isHardMode}
              />
              <div className="text-center h-8">
                 <span className="text-2xl font-black text-accent drop-shadow-sm">
                  {nextCeleb.influence?.total_score ?? 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 액션 영역 - 고정 높이로 레이아웃 안정화 */}
      <div className="relative h-32">
        {/* playing 상태 */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-3 ${
            isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <p className="text-text-secondary text-sm">오른쪽 셀럽의 영향력이 왼쪽보다...</p>
          <div className="flex gap-3">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => handleChoice("higher")}
              className="min-w-[120px] gap-2 transition-none whitespace-nowrap"
            >
              <ArrowUp size={18} />
              <span>높다</span>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => handleChoice("lower")}
              className="min-w-[120px] gap-2 transition-none whitespace-nowrap"
            >
              <ArrowDown size={18} />
              <span>낮다</span>
            </Button>
          </div>
        </div>

        {/* revealing 상태 */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-3 ${
            isRevealing ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className={`text-lg font-bold ${isCorrect ? "text-green-500" : "text-red-500"}`}>
            {isCorrect ? "정답!" : "오답..."}
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={handleNext}
            className="min-w-[160px] transition-none active:scale-95 shadow-lg shadow-accent/25"
          >
            {isCorrect ? "다음 문제" : "결과 보기"}
          </Button>
          <p className={`text-xs text-text-tertiary ${isHardMode ? "invisible" : ""}`}>
            카드를 탭하여 상세 보기
          </p>
        </div>
      </div>

      {/* 모달 */}
      <GameResultModal
        isOpen={gameState === "gameover"}
        streak={streak}
        highScore={highScore}
        onRestart={() => setGameState("idle")}
      />
      <CelebInfluenceModal
        celebId={selectedCelebId ?? ""}
        isOpen={!!selectedCelebId}
        onClose={() => setSelectedCelebId(null)}
      />
    </div>
  );
}
