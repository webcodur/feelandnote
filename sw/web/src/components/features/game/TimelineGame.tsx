/*
  파일명: components/features/game/TimelineGame.tsx
  기능: 타임라인 게임 메인 컴포넌트
  책임: 셀럽 생년을 시간순으로 배치하는 게임
  업데이트: Neo-Pantheon 디자인 적용 (ArenaCard 기반)
*/
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getCelebs } from "@/actions/home/getCelebs";
import type { CelebProfile } from "@/types/home";
import { Button } from "@/components/ui";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { isPublicDomainCeleb, PUBLIC_DOMAIN_NOTICE } from "./utils";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";
import GameHeader from "./GameHeader";
import ArenaCard from "./ArenaCard";
import { cn } from "@/lib/utils";

type GameState = "idle" | "playing" | "gameover";
type Difficulty = "easy" | "hard";

interface TimelineCeleb extends CelebProfile {
  birthYear: number;
}

// region: 연도 파싱 유틸
function parseBirthYear(birthDate: string | null): number | null {
  if (!birthDate) return null;

  const bcMatch = birthDate.match(/(?:BC|기원전)\s*(\d+)/i);
  if (bcMatch) return -parseInt(bcMatch[1], 10);

  const yearMatch = birthDate.match(/(\d{4})/);
  if (yearMatch) return parseInt(yearMatch[1], 10);

  return null;
}

function formatYear(year: number): string {
  if (year < 0) return `기원전 ${Math.abs(year)}년`;
  return `${year}년`;
}
// endregion

// region: 배치 슬롯 컴포넌트
function PlacementSlot({
  onClick,
  disabled,
  position,
  isActive,
}: {
  onClick: () => void;
  disabled: boolean;
  position: "start" | "middle" | "end";
  isActive?: boolean;
}) {
  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
  };

  return (
    <button
      onClick={onClick}
      onTouchEnd={handleTouchEnd}
      disabled={disabled}
      className={cn(
        "group relative flex-shrink-0 w-10 h-24 md:w-16 md:h-32 flex items-center justify-center transition-all duration-300 touch-pan-x",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer [@media(hover:hover)]:hover:w-14 [@media(hover:hover)]:md:hover:w-24"
      )}
    >
      <div className={cn(
        "absolute inset-x-1 md:inset-x-2 top-2 md:top-4 bottom-2 md:bottom-4 border-2 border-dashed border-accent/20 rounded-lg transition-all duration-300",
        isActive ? "bg-accent/10 border-accent/60" : "[@media(hover:hover)]:group-hover:bg-accent/5 [@media(hover:hover)]:group-hover:border-accent/40"
      )}>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
           <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
             <span className="text-base md:text-xl font-bold">+</span>
           </div>
        </div>
      </div>

      <span className="absolute bottom-0 text-[8px] md:text-[10px] text-accent/60 font-cinzel opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity whitespace-nowrap">
        배치
      </span>
    </button>
  );
}
// endregion

export default function TimelineGame() {
  const [allCelebs, setAllCelebs] = useState<TimelineCeleb[]>([]);
  const [timeline, setTimeline] = useState<TimelineCeleb[]>([]);
  const [currentCard, setCurrentCard] = useState<TimelineCeleb | null>(null);
  const [remainingCelebs, setRemainingCelebs] = useState<TimelineCeleb[]>([]);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [isRevealing, setIsRevealing] = useState(false);
  const [wrongPosition, setWrongPosition] = useState<number | null>(null);
  const [correctPosition, setCorrectPosition] = useState<number | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [selectedCeleb, setSelectedCeleb] = useState<TimelineCeleb | null>(null);
  const [pendingTimeline, setPendingTimeline] = useState<TimelineCeleb[] | null>(null);
  const [pendingPlaceIndex, setPendingPlaceIndex] = useState<number | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const isEasyMode = difficulty === "easy";
  const isNewRecord = streak === highScore && streak > 0;
  const isGameOver = gameState === "gameover";

  // region: 데이터 로드
  useEffect(() => {
    const loadCelebs = async () => {
      const result = await getCelebs({ limit: 200, sortBy: "influence" });

      const withBirthYear = result.celebs
        .filter((c) => isPublicDomainCeleb(c.death_date ?? null))
        .map((c) => {
          const birthYear = parseBirthYear(c.birth_date);
          return birthYear !== null ? { ...c, birthYear } : null;
        })
        .filter((c): c is TimelineCeleb => c !== null);

      setAllCelebs(withBirthYear);
      setIsDataLoaded(true);

      const saved = localStorage.getItem("timeline-highscore");
      if (saved) setHighScore(parseInt(saved, 10));
    };
    loadCelebs();
  }, []);
  // endregion

  // region: 게임 시작
  const startGame = useCallback(
    (selectedDifficulty: Difficulty) => {
      if (allCelebs.length < 5) return;

      setDifficulty(selectedDifficulty);

      const shuffled = [...allCelebs].sort(() => Math.random() - 0.5);
      const [first, second, ...rest] = shuffled;

      setTimeline([first]);
      setCurrentCard(second);
      setRemainingCelebs(rest);
      setStreak(0);
      setGameState("playing");
      setIsRevealing(false);
      setWrongPosition(null);
      setCorrectPosition(null);
    },
    [allCelebs]
  );
  // endregion

  // region: 배치 선택
  const handlePlace = (index: number) => {
    if (!currentCard || gameState !== "playing" || isRevealing) return;

    const foundCorrectIndex = timeline.findIndex((c) => c.birthYear > currentCard.birthYear);
    const actualCorrectIndex = foundCorrectIndex === -1 ? timeline.length : foundCorrectIndex;

    const isCorrect = index === actualCorrectIndex;
    setIsRevealing(true);

    if (isCorrect) {
      const newTimeline = [...timeline];
      newTimeline.splice(index, 0, currentCard);
      setCorrectPosition(index);
      setPendingTimeline(newTimeline);
      setPendingPlaceIndex(index);

      setStreak((prev) => {
        const next = prev + 1;
        if (next > highScore) {
           setHighScore(next);
           localStorage.setItem("timeline-highscore", next.toString());
        }
        return next;
      });
    } else {
      setWrongPosition(index);

      setTimeout(() => {
        setGameState("gameover");
        setIsRevealing(false);
      }, 1500);
    }
  };
  // endregion

  // region: 정답 처리 - 자동으로 다음 라운드 진행
  const proceedToNextRound = useCallback(() => {
    if (!pendingTimeline || pendingPlaceIndex === null) return;

    setTimeline(pendingTimeline);
    setCorrectPosition(null);

    if (remainingCelebs.length === 0) {
      setGameState("gameover");
    } else {
      const [next, ...rest] = remainingCelebs;
      setCurrentCard(next);
      setRemainingCelebs(rest);
    }
    setIsRevealing(false);
    setPendingTimeline(null);

    setTimeout(() => {
      timelineRef.current?.scrollTo({
        left: pendingPlaceIndex * 140,
        behavior: "smooth",
      });
      setPendingPlaceIndex(null);
    }, 100);
  }, [pendingTimeline, pendingPlaceIndex, remainingCelebs]);

  useEffect(() => {
    if (isRevealing && wrongPosition === null && pendingTimeline) {
      const timer = setTimeout(() => {
        proceedToNextRound();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isRevealing, wrongPosition, pendingTimeline, proceedToNextRound]);
  // endregion

  // region: 스크롤 버튼
  const scrollTimeline = (direction: "left" | "right") => {
    if (!timelineRef.current) return;
    const scrollAmount = 300;
    timelineRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };
  // endregion

  // region: 렌더링
  if (!isDataLoaded) {
     return (
        <div className="flex items-center justify-center min-h-[500px]">
           <div className="animate-pulse text-text-secondary font-serif">역사 로딩 중...</div>
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
                  주어진 인물을 연대기 순서에 맞게<br/>
                  <strong className="text-accent">올바른 위치</strong>에 배치하세요.
                </p>
             </div>

             <div className="grid grid-cols-2 gap-3 mt-6">
               <button
                 onClick={() => startGame("easy")}
                 disabled={allCelebs.length < 5}
                 className="flex flex-col items-center justify-center p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent/50 transition-all active:scale-95 disabled:opacity-50"
               >
                 <div className="font-bold text-white font-serif text-lg">초급</div>
                 <span className="text-[10px] text-text-tertiary uppercase tracking-wider mt-1">탭하여 정보 보기</span>
               </button>
               <button
                 onClick={() => startGame("hard")}
                 disabled={allCelebs.length < 5}
                 className="flex flex-col items-center justify-center p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent/50 transition-all active:scale-95 disabled:opacity-50"
               >
                 <div className="font-bold text-white font-serif text-lg">고급</div>
                 <span className="text-[10px] text-text-tertiary uppercase tracking-wider mt-1">연도 숨김</span>
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

  const showCorrectEffect = isRevealing && wrongPosition === null;
  const showWrongEffect = wrongPosition !== null;

  return (
    <div className={cn(
      "max-w-6xl mx-auto flex flex-col min-h-[500px] md:min-h-[600px] justify-between pb-4 md:pb-8 transition-colors duration-300",
      showCorrectEffect && "bg-green-900/20",
      showWrongEffect && "bg-red-900/20"
    )}>
      {/* 공통 헤더 */}
      <GameHeader
        difficulty={difficulty}
        difficultyLabel={isEasyMode ? "초급" : "고급"}
        streak={streak}
        highScore={highScore}
        remaining={remainingCelebs.length}
        onBack={() => setGameState("idle")}
        className="mb-2 md:mb-4"
      />

      {/* 상단: 현재 카드 */}
      <div className="flex-1 flex flex-col items-center justify-center mb-3 md:mb-8 relative">
        {currentCard && (
          <div className="relative z-20 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="py-2 md:py-3 text-center">
              <h2 className="text-sm md:text-base font-serif font-bold text-text-secondary">
                이 인물은 어디에?
              </h2>
            </div>

            <div className="w-32 md:w-48 aspect-[2/3] relative group perspective-1000">
              <ArenaCard
                imageUrl={currentCard.portrait_url ?? currentCard.avatar_url}
                name={currentCard.nickname}
                title={currentCard.profession}
                subText={(isRevealing || isGameOver) ? formatYear(currentCard.birthYear) : "????"}
                isRevealed={isRevealing || isGameOver}
                status="selected"
                className="w-full h-full border-accent ring-4 ring-accent/20"
                onClick={isEasyMode ? () => setSelectedCeleb(currentCard) : undefined}
                onInfoClick={() => setSelectedCeleb(currentCard)}
              />
            </div>
          </div>
        )}
      </div>

      {/* 하단: 타임라인 (갤러리) */}
      <div className="relative w-full bg-black/40 border-t border-b border-white/10 backdrop-blur-md">

        {/* 장식용 레일 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

        {/* 좌우 이동 버튼 (데스크탑) */}
        <button
           onClick={() => scrollTimeline("left")}
           className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-black/50 border border-white/20 hover:bg-white/10 hover:border-accent text-white transition-all"
        >
           <ChevronLeft size={20} />
        </button>
        <button
           onClick={() => scrollTimeline("right")}
           className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-black/50 border border-white/20 hover:bg-white/10 hover:border-accent text-white transition-all"
        >
           <ChevronRight size={20} />
        </button>

        {/* 스크롤 영역 */}
        <div
          ref={timelineRef}
          className="overflow-x-auto py-4 md:py-8 scrollbar-hide touch-pan-x"
        >
          <div className="inline-flex items-center gap-1 md:gap-2 px-4 md:px-8 min-w-full justify-center">
            {/* Start Slot */}
            <PlacementSlot
              position="start"
              onClick={() => handlePlace(0)}
              disabled={isRevealing || isGameOver}
              isActive={correctPosition === 0}
            />

            {/* 배치된 카드들 */}
            {timeline.map((celeb, index) => (
              <div key={celeb.id} className="flex items-center gap-1 md:gap-2 snap-center">

                {/* 카드 본체 */}
                <div className="flex flex-col items-center">
                  <div className="w-24 h-36 md:w-40 md:h-60 relative shrink-0">
                    <ArenaCard
                      imageUrl={celeb.portrait_url ?? celeb.avatar_url}
                      name={celeb.nickname}
                      title={null}
                      subText={formatYear(celeb.birthYear)}
                      isRevealed={true}
                      status="normal"
                      isHidden={false}
                      className="w-full h-full"
                      onInfoClick={() => setSelectedCeleb(celeb)}
                    />

                    {/* 연결 선 (좌우) */}
                    <div className="absolute top-1/2 -left-2 md:-left-4 w-2 md:w-4 h-[2px] bg-white/20" />
                    <div className="absolute top-1/2 -right-2 md:-right-4 w-2 md:w-4 h-[2px] bg-white/20" />
                  </div>
                </div>

                {/* 사이 슬롯 */}
                <PlacementSlot
                  position={index === timeline.length - 1 ? "end" : "middle"}
                  onClick={() => handlePlace(index + 1)}
                  disabled={isRevealing || isGameOver}
                  isActive={correctPosition === index + 1}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 게임오버 - 다시하기 */}
      {isGameOver && (
        <div className="flex flex-col items-center gap-2 py-4 animate-in fade-in duration-300">
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

      {/* 셀럽 상세 모달 */}
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
