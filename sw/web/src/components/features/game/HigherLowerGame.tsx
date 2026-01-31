/*
  파일명: components/features/game/HigherLowerGame.tsx
  기능: 업다운 게임 메인 컴포넌트
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

type GameState = "idle" | "loading" | "playing" | "thinking" | "revealing" | "gameover";
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

  // 서스펜스 상태
  const [userChoice, setUserChoice] = useState<"higher" | "lower" | null>(null);
  const [dotCount, setDotCount] = useState(0);

  // 애니메이션 상태
  const [leftFadeOut, setLeftFadeOut] = useState(false);
  const [showSlider, setShowSlider] = useState(false);
  const [sliderAtLeft, setSliderAtLeft] = useState(false);
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

    setUserChoice(choice);
    setDotCount(1);
    setGameState("thinking");

    // 서스펜스: 1초마다 dot 추가
    setTimeout(() => setDotCount(2), 1000);
    setTimeout(() => setDotCount(3), 2000);

    // 3초 후 정답 공개
    setTimeout(() => {
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
    }, 3000);
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
      // Phase 2: 우측 → 좌측 슬라이드 (슬라이더가 이동하면서 신규 카드가 드러남)
      setShowSlider(true);
      requestAnimationFrame(() => setSliderAtLeft(true));

      setTimeout(() => {
        // 데이터 스왑 (슬라이더/신규 카드가 가리고 있는 상태)
        setCurrentCeleb(nextCeleb);
        setNextCeleb(newNext);
        setLeftFadeOut(false);

        // 다음 프레임에서 슬라이더/신규 카드 제거
        requestAnimationFrame(() => {
          setShowSlider(false);
          setSliderAtLeft(false);
          setPendingNext(null);
          setUserChoice(null);
          setDotCount(0);
          setGameState("playing");
          setIsCorrect(null);
        });
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
          <h2 className="text-2xl font-black text-white font-serif">업다운</h2>
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
    <div className="max-w-2xl mx-auto">
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
          className={`flex flex-col gap-3 ${
            leftFadeOut ? "opacity-0 transition-opacity duration-300" : "opacity-100"
          }`}
        >
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

        {/* 우측 카드 - 기본 상태 (슬라이더 없을 때) */}
        <div
          className={`flex flex-col gap-3 ${
            showSlider ? "opacity-0" : "opacity-100"
          }`}
        >
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

        {/* 신규 카드 (우측에 미리 배치 - 슬라이더 아래) */}
        {showSlider && pendingNext && (
          <div className="absolute top-0 end-0 w-[calc(50%-0.5rem)]">
            <div className="flex flex-col gap-3">
              <GameCelebCard
                celeb={pendingNext}
                showScore={false}
                isLeft={false}
                hideInfo={isHardMode}
              />
              <div className="text-center h-8">
                <span className="text-2xl font-black text-text-tertiary">???</span>
              </div>
            </div>
          </div>
        )}

        {/* 슬라이딩 카드 (우측 → 좌측 이동 - 신규 카드 위) */}
        {showSlider && (
          <div
            className={`absolute top-0 end-0 w-[calc(50%-0.5rem)] z-10 transition-transform duration-300 ${
              sliderAtLeft ? "-translate-x-[calc(100%+1rem)]" : ""
            }`}
          >
            <div className="flex flex-col gap-3">
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
          <p className="text-text-secondary text-sm">
            <span className="text-amber-400 font-medium">{isHardMode ? "오른쪽" : nextCeleb.nickname}</span>이(가){" "}
            <span className="text-amber-400 font-medium">{isHardMode ? "왼쪽" : currentCeleb.nickname}</span>보다...
          </p>
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

        {/* thinking 상태 (서스펜스) */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-3 ${
            gameState === "thinking" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <p className="text-sm text-text-secondary">
            <span className="text-amber-400 font-medium">{isHardMode ? "오른쪽" : nextCeleb.nickname}</span>이(가){" "}
            <span className="text-amber-400 font-medium">{isHardMode ? "왼쪽" : currentCeleb.nickname}</span>보다{" "}
            <span className="font-bold text-white">{userChoice === "higher" ? "높다" : "낮다"}</span>?
          </p>
          <div className="text-2xl font-bold text-accent tracking-widest">
            {".".repeat(dotCount)}
          </div>
        </div>

        {/* revealing 상태 */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-3 ${
            isRevealing ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="text-center">
            <p className="text-sm text-text-secondary mb-1">
              <span className="text-amber-400 font-medium">{isHardMode ? "오른쪽" : nextCeleb.nickname}</span>이(가){" "}
              <span className="text-amber-400 font-medium">{isHardMode ? "왼쪽" : currentCeleb.nickname}</span>보다{" "}
              <span className="font-bold text-white">
                {(nextCeleb.influence?.total_score ?? 0) >= (currentCeleb.influence?.total_score ?? 0)
                  ? "높다"
                  : "낮다"}
              </span>
            </p>
            <div className={`text-lg font-bold ${isCorrect ? "text-green-500" : "text-red-500"}`}>
              {isCorrect ? "(정답!)" : "(오답...)"}
            </div>
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
