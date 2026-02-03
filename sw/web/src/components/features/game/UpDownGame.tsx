/*
  파일명: components/features/game/UpDownGame.tsx
  기능: 업다운 게임 메인 컴포넌트
  책임: 게임 로직, 상태 관리, UI 렌더링
  업데이트: Neo-Pantheon 디자인 적용 (ArenaCard 사용)
*/
"use client";

import { useState, useEffect, useCallback } from "react";
import { getCelebs } from "@/actions/home/getCelebs";
import type { CelebProfile } from "@/types/home";
import GameResultModal from "./GameResultModal";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";
import { Button } from "@/components/ui";
import { ArrowUp, ArrowDown, Info } from "lucide-react";
import { isPublicDomainCeleb, PUBLIC_DOMAIN_NOTICE } from "./utils";
import GameHeader from "./GameHeader";
import ArenaCard from "./ArenaCard";
import { cn } from "@/lib/utils";

type GameState = "idle" | "loading" | "playing" | "thinking" | "revealing" | "gameover";
type Difficulty = "easy" | "hard";

export default function UpDownGame() {
  const [celebs, setCelebs] = useState<CelebProfile[]>([]);
  const [currentCeleb, setCurrentCeleb] = useState<CelebProfile | null>(null);
  const [nextCeleb, setNextCeleb] = useState<CelebProfile | null>(null);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [selectedCeleb, setSelectedCeleb] = useState<CelebProfile | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // 서스펜스 상태
  const [userChoice, setUserChoice] = useState<"higher" | "lower" | null>(null);

  // 애니메이션 상태
  const [leftFadeOut, setLeftFadeOut] = useState(false);
  const [showSlider, setShowSlider] = useState(false);
  const [sliderAtLeft, setSliderAtLeft] = useState(false);
  const [pendingNext, setPendingNext] = useState<CelebProfile | null>(null);

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
    setGameState("thinking");

    // 1.5초 딜레이 (긴장감 조성)
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
          localStorage.setItem("up-down-highscore", newStreak.toString());
        }
      }
    }, 1500);
  };

  // 정답일 때 자동으로 다음으로 진행
  useEffect(() => {
    if (gameState === "revealing" && isCorrect) {
      const timer = setTimeout(() => {
        handleNext();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [gameState, isCorrect]);

  const handleNext = () => {
    if (!nextCeleb) return;

    if (!isCorrect) {
      setGameState("gameover");
      return;
    }

    const newNext = pickRandomCeleb(nextCeleb.id);
    setPendingNext(newNext);

    // 슬라이드 애니메이션 시작
    setLeftFadeOut(true);

    setTimeout(() => {
      setShowSlider(true);
      requestAnimationFrame(() => setSliderAtLeft(true));

      setTimeout(() => {
        setCurrentCeleb(nextCeleb);
        setNextCeleb(newNext);
        setLeftFadeOut(false);

        requestAnimationFrame(() => {
          setShowSlider(false);
          setSliderAtLeft(false);
          setPendingNext(null);
          setUserChoice(null);
          setGameState("playing");
          setIsCorrect(null);
        });
      }, 500); // 0.5s 슬라이드
    }, 300); // 0.3s 페이드아웃
  };

  // region: 렌더링
  if (!isDataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-pulse text-text-secondary font-serif">전장 입장 중...</div>
      </div>
    );
  }

  // 게임 시작 화면
  if (gameState === "idle") {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center text-center">
        <div className="w-full max-w-sm bg-bg-card border border-border rounded-xl p-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
          
          <div className="space-y-4 relative z-10">
            <div className="space-y-2">
               <h3 className="text-lg font-bold text-white font-serif">게임 규칙</h3>
               <p className="text-sm text-text-secondary leading-relaxed">
                 왼쪽 인물보다 오른쪽 인물의 영향력이<br/>
                 <strong className="text-accent">더 높은지</strong> 혹은 <strong className="text-accent">낮은지</strong> 예측하세요.
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
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider mt-1">이름 숨김</span>
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

  if (!currentCeleb || !nextCeleb) return null;

  const isHardMode = difficulty === "hard";
  const isPlaying = gameState === "playing";
  const isRevealing = gameState === "revealing";
  const isThinking = gameState === "thinking";

  const showCorrectEffect = isRevealing && isCorrect;

  return (
    <div className={cn(
      "max-w-4xl mx-auto flex flex-col min-h-[500px] md:min-h-[600px] justify-between pb-4 md:pb-8 relative transition-colors duration-300",
      showCorrectEffect && "bg-green-500/5"
    )}>
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
        
        {/* Background Atmosphere (Spotlight) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none" />

        {/* VS Badge (Responsive) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex items-center justify-center w-12 h-12 md:w-20 md:h-20 rounded-full bg-bg-main border-2 border-accent shadow-[0_0_20px_rgba(212,175,55,0.4)] md:shadow-[0_0_40px_rgba(212,175,55,0.5)]">
           <span className="font-cinzel font-black text-accent text-lg md:text-2xl drop-shadow-md pt-1">VS</span>
        </div>

        {/* Mobile Grid Layout Wrapper */}
        <div className="grid grid-cols-2 gap-2 md:flex md:gap-12 w-full md:w-auto relative z-10 justify-center">
          
          {/* Left Card (Champion) */}
          <div 
            className={cn(
              "w-full md:w-[320px] aspect-[2/3] transition-all duration-500",
               leftFadeOut ? "opacity-0 -translate-x-10" : "opacity-100"
            )}
          >
            <ArenaCard
              imageUrl={currentCeleb.portrait_url ?? currentCeleb.avatar_url}
              name={currentCeleb.nickname}
              title={currentCeleb.profession}
              subText={currentCeleb.influence?.total_score?.toLocaleString() ?? 0}
              subTextLabel="영향력"
              isRevealed={true}
              isHidden={isHardMode}
              status="normal"
              className="w-full h-full"
              onClick={isHardMode ? undefined : () => setSelectedCeleb(currentCeleb)}
            />
          </div>

          {/* Right Card (Challenger) */}
          <div className="w-full md:w-[320px] aspect-[2/3] relative">
            {/* Main Card */}
            <div className={cn(
              "w-full h-full transition-opacity duration-300",
              showSlider ? "opacity-0" : "opacity-100"
            )}>
              <ArenaCard
                imageUrl={nextCeleb.portrait_url ?? nextCeleb.avatar_url}
                name={nextCeleb.nickname}
                title={nextCeleb.profession}
                subText={isRevealing ? nextCeleb.influence?.total_score?.toLocaleString() : "???"}
                subTextLabel="영향력"
                isRevealed={isRevealing}
                isHidden={isHardMode}
                status={
                  isRevealing 
                    ? (isCorrect ? "win" : "lose") 
                    : (isPlaying || isThinking ? "selected" : "normal")
                }
                className="w-full h-full"
              />
            </div>

            {/* Pending Next Card (Under Slider) */}
            {showSlider && pendingNext && (
              <div className="absolute inset-0 z-0">
                 <ArenaCard
                  imageUrl={pendingNext.portrait_url ?? pendingNext.avatar_url}
                  name={pendingNext.nickname}
                  title={pendingNext.profession}
                  subText="???"
                  subTextLabel="영향력"
                  isRevealed={false}
                  isHidden={isHardMode}
                  className="w-full h-full"
                />
              </div>
            )}

            {/* Slider Card (Moving Overlay) */}
            {showSlider && (
               <div className={cn(
                 "absolute inset-0 z-10 transition-transform duration-500 ease-in-out",
                 sliderAtLeft ? "md:-translate-x-[calc(100%+3rem)] -translate-x-full md:-translate-y-0" : "" // 모바일에서는 X축 이동만
               )}>
                  <ArenaCard
                    imageUrl={nextCeleb.portrait_url ?? nextCeleb.avatar_url}
                    name={nextCeleb.nickname}
                    title={nextCeleb.profession}
                    subText={nextCeleb.influence?.total_score?.toLocaleString()}
                    subTextLabel="영향력"
                    isRevealed={true}
                    isHidden={isHardMode}
                    status="normal"
                    className="w-full h-full"
                  />
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Interaction Area */}
      <div className="mt-2 md:mt-4 flex flex-col items-center justify-center min-h-[100px] z-30">
        
        {/* Playing State: Buttons (Stone Tablet Style) */}
        {isPlaying && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300 w-full md:w-auto px-4 md:px-0">
             <p className="text-text-secondary text-sm md:text-base font-cinzel">
                오른쪽 인물이 왼쪽 인물보다 영향력이...
             </p>
             <div className="flex items-center gap-2 md:gap-6 w-full md:w-auto">
             <button
                onClick={() => handleChoice("higher")}
                className="flex-1 md:flex-none min-w-0 md:min-w-[160px] h-14 md:h-16 group relative overflow-hidden rounded-xl border border-white/10 shadow-lg active:scale-95 transition-transform"
             >
                {/* Button Background (Stone Texture) */}
                <div className="absolute inset-0 bg-[#2a2a2a]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                
                {/* Glow on Hover */}
                <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/10 transition-colors duration-300" />
                
                {/* Content */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center gap-0.5">
                  <div className="flex items-center gap-2 text-white group-hover:text-accent transition-colors drop-shadow-md">
                    <ArrowUp size={24} className="stroke-[2]" /> 
                    <span className="font-serif font-medium text-lg md:text-xl tracking-wide">더 높다</span>
                  </div>
                  <span className="text-[10px] text-text-tertiary tracking-wider group-hover:text-accent/70 hidden md:block">점수가 더 높음</span>
                </div>
             </button>

             <button
                onClick={() => handleChoice("lower")}
                className="flex-1 md:flex-none min-w-0 md:min-w-[160px] h-14 md:h-16 group relative overflow-hidden rounded-xl border border-white/10 shadow-lg active:scale-95 transition-transform"
             >
                {/* Button Background (Stone Texture) */}
                <div className="absolute inset-0 bg-[#2a2a2a]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                {/* Glow on Hover */}
                <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/10 transition-colors duration-300" />

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center gap-0.5">
                  <div className="flex items-center gap-2 text-white group-hover:text-red-400 transition-colors drop-shadow-md">
                    <ArrowDown size={24} className="stroke-[2]" /> 
                    <span className="font-serif font-medium text-lg md:text-xl tracking-wide">더 낮다</span>
                  </div>
                  <span className="text-[10px] text-text-tertiary tracking-wider group-hover:text-red-400/70 hidden md:block">점수가 더 낮음</span>
                </div>
             </button>
             </div>
          </div>
        )}

        {/* Thinking State */}
        {isThinking && (
           <div className="flex flex-col items-center animate-pulse">
              <p className="text-xl font-serif text-accent mb-2">
                 {userChoice === "higher" ? "더 높을 것이다..." : "더 낮을 것이다..."}
              </p>
              <div className="flex gap-1.5">
                 <div className="w-2 h-2 rounded-full bg-accent animate-bounce delay-0" />
                 <div className="w-2 h-2 rounded-full bg-accent animate-bounce delay-150" />
                 <div className="w-2 h-2 rounded-full bg-accent animate-bounce delay-300" />
              </div>
           </div>
        )}

        {/* Revealing/Result State - 오답일 때만 */}
        {isRevealing && !isCorrect && (
           <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
              <div className="mb-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-3xl font-black text-red-500 font-serif drop-shadow-glow">패배했습니다</span>
                  <span className="text-sm text-red-400/80 font-cinzel">게임 종료</span>
                </div>
              </div>

              <Button
                 size="lg"
                 onClick={handleNext}
                 className="min-w-[200px] h-14 font-serif text-lg font-bold rounded-xl shadow-xl transition-transform active:scale-95 bg-white/10 text-white hover:bg-white/20 border border-white/20"
              >
                 결과 보기
              </Button>
           </div>
        )}
      </div>

      <GameResultModal
        isOpen={gameState === "gameover"}
        streak={streak}
        highScore={highScore}
        onRestart={() => setGameState("idle")}
      />
      {selectedCeleb && (
        <CelebDetailModal
          celeb={selectedCeleb}
          isOpen={!!selectedCeleb}
          onClose={() => setSelectedCeleb(null)}
          hideBirthDate
        />
      )}
    </div>
  );
}
