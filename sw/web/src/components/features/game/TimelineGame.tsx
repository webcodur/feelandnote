/*
  파일명: components/features/game/TimelineGame.tsx
  기능: 타임라인 게임 메인 컴포넌트
  책임: 셀럽 생년을 시간순으로 배치하는 게임
*/ // ------------------------------

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getCelebs } from "@/actions/home/getCelebs";
import type { CelebProfile } from "@/types/home";
import { Button } from "@/components/ui";
import { Clock, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";
import GameHeader from "./GameHeader";

type GameState = "idle" | "playing" | "gameover";
type Difficulty = "easy" | "hard";

interface TimelineCeleb extends CelebProfile {
  birthYear: number;
}

// region: 연도 파싱 유틸
function parseBirthYear(birthDate: string | null): number | null {
  if (!birthDate) return null;

  // "BC" 또는 "기원전" 처리
  const bcMatch = birthDate.match(/(?:BC|기원전)\s*(\d+)/i);
  if (bcMatch) return -parseInt(bcMatch[1], 10);

  // 일반 연도 (4자리)
  const yearMatch = birthDate.match(/(\d{4})/);
  if (yearMatch) return parseInt(yearMatch[1], 10);

  return null;
}

function formatYear(year: number): string {
  if (year < 0) return `BC ${Math.abs(year)}`;
  return `${year}년`;
}
// endregion

// region: 타임라인 카드 컴포넌트
function TimelineCard({
  celeb,
  showYear,
  isNew,
  isWrong,
  size = "normal",
  onClick,
  clickable = false,
}: {
  celeb: TimelineCeleb;
  showYear: boolean;
  isNew?: boolean;
  isWrong?: boolean;
  size?: "small" | "normal" | "large";
  onClick?: () => void;
  clickable?: boolean;
}) {
  const sizeStyles = {
    small: "w-20 h-36 md:w-24 md:h-42",
    normal: "w-28 h-50 md:w-32 md:h-56",
    large: "w-36 h-64 md:w-44 md:h-78",
  };

  const textStyles = {
    small: "text-[10px] md:text-xs",
    normal: "text-sm",
    large: "text-base md:text-lg",
  };

  const handleClick = () => {
    if (clickable && onClick) onClick();
  };

  return (
    <div
      onClick={handleClick}
      className={`
        ${sizeStyles[size]} flex-shrink-0
        bg-bg-card rounded-xl border overflow-hidden
        relative
        ${isNew ? "border-accent shadow-lg shadow-accent/20" : "border-border"}
        ${isWrong ? "border-red-500 shadow-lg shadow-red-500/20" : ""}
        ${clickable ? "cursor-pointer hover:ring-2 hover:ring-accent/50" : ""}
      `}
    >
      {/* 이미지 - 전체 영역 */}
      <div className="absolute inset-0 bg-white/5">
        {celeb.portrait_url ?? celeb.avatar_url ? (
          <img
            src={celeb.portrait_url ?? celeb.avatar_url ?? ""}
            alt={celeb.nickname}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl text-text-tertiary">
            {celeb.nickname.charAt(0)}
          </div>
        )}
      </div>

      {/* 그라데이션 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* 정보 - 오버레이 */}
      <div className={`absolute bottom-0 start-0 end-0 text-center ${size === "large" ? "p-3" : "p-2"}`}>
        <p className={`font-medium text-white truncate drop-shadow-md ${textStyles[size]}`}>
          {celeb.nickname}
        </p>
        {showYear ? (
          <p className={`text-accent font-bold drop-shadow-md ${textStyles[size]}`}>
            {formatYear(celeb.birthYear)}
          </p>
        ) : (
          <p className={`text-text-tertiary drop-shadow-md ${textStyles[size]}`}>???</p>
        )}
      </div>
    </div>
  );
}
// endregion

// region: 배치 슬롯 컴포넌트
function PlacementSlot({
  onClick,
  disabled,
  position,
}: {
  onClick: () => void;
  disabled: boolean;
  position: "start" | "middle" | "end";
}) {
  const positionLabel = {
    start: "이전",
    middle: "사이",
    end: "이후",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex-shrink-0 w-10 h-28 md:w-12 md:h-32
        border-2 border-dashed border-accent/40 rounded-lg
        flex items-center justify-center
        hover:border-accent hover:bg-accent/10
        disabled:opacity-30 disabled:cursor-not-allowed
      `}
    >
      <span className="text-[10px] md:text-xs text-accent font-medium">{positionLabel[position]}</span>
    </button>
  );
}
// endregion

// region: 결과 모달
function ResultModal({
  isOpen,
  streak,
  highScore,
  onRestart,
}: {
  isOpen: boolean;
  streak: number;
  highScore: number;
  onRestart: () => void;
}) {
  if (!isOpen) return null;

  const isNewRecord = streak === highScore && streak > 0;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/70">
      <div className="bg-bg-card border border-border rounded-2xl p-6 max-w-sm w-full text-center">
        <h2 className="text-xl font-bold text-white mb-2">게임 오버</h2>

        {isNewRecord && (
          <p className="text-accent text-sm mb-4">🎉 새로운 최고 기록!</p>
        )}

        <div className="flex justify-center gap-8 mb-6">
          <div>
            <p className="text-text-secondary text-sm">이번 기록</p>
            <p className="text-2xl font-bold text-white">{streak}</p>
          </div>
          <div>
            <p className="text-text-secondary text-sm">최고 기록</p>
            <p className="text-2xl font-bold text-accent">{highScore}</p>
          </div>
        </div>

        <Button variant="primary" size="lg" onClick={onRestart} className="w-full gap-2">
          <RotateCcw size={18} />
          다시 하기
        </Button>
      </div>
    </div>
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
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [selectedCeleb, setSelectedCeleb] = useState<TimelineCeleb | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const isEasyMode = difficulty === "easy";

  // region: 데이터 로드
  useEffect(() => {
    const loadCelebs = async () => {
      const result = await getCelebs({ limit: 100, sortBy: "influence" });

      const withBirthYear = result.celebs
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

      // 셔플
      const shuffled = [...allCelebs].sort(() => Math.random() - 0.5);

      // 첫 카드는 타임라인에, 두 번째 카드는 현재 카드로
      const [first, second, ...rest] = shuffled;

      setTimeline([first]);
      setCurrentCard(second);
      setRemainingCelebs(rest);
      setStreak(0);
      setGameState("playing");
      setIsRevealing(false);
      setWrongPosition(null);
    },
    [allCelebs]
  );
  // endregion

  // region: 배치 선택
  const handlePlace = (index: number) => {
    if (!currentCard || gameState !== "playing" || isRevealing) return;

    setIsRevealing(true);

    // 정답 위치 찾기
    const correctIndex = timeline.findIndex((c) => c.birthYear > currentCard.birthYear);
    const actualCorrectIndex = correctIndex === -1 ? timeline.length : correctIndex;

    const isCorrect = index === actualCorrectIndex;

    if (isCorrect) {
      // 정답: 타임라인에 삽입
      const newTimeline = [...timeline];
      newTimeline.splice(index, 0, currentCard);
      setTimeline(newTimeline);

      const newStreak = streak + 1;
      setStreak(newStreak);

      if (newStreak > highScore) {
        setHighScore(newStreak);
        localStorage.setItem("timeline-highscore", newStreak.toString());
      }

      // 다음 카드
      setTimeout(() => {
        if (remainingCelebs.length === 0) {
          // 모든 카드 사용 완료 - 승리
          setGameState("gameover");
        } else {
          const [next, ...rest] = remainingCelebs;
          setCurrentCard(next);
          setRemainingCelebs(rest);
        }
        setIsRevealing(false);

        // 스크롤 조정
        setTimeout(() => {
          timelineRef.current?.scrollTo({
            left: timelineRef.current.scrollWidth / 2 - timelineRef.current.clientWidth / 2,
            behavior: "smooth",
          });
        }, 100);
      }, 1000);
    } else {
      // 오답
      setWrongPosition(index);

      setTimeout(() => {
        setGameState("gameover");
        setIsRevealing(false);
      }, 1500);
    }
  };
  // endregion

  // region: 스크롤 버튼
  const scrollTimeline = (direction: "left" | "right") => {
    if (!timelineRef.current) return;
    const scrollAmount = 200;
    timelineRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };
  // endregion

  // region: 렌더링
  if (!isDataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-text-secondary">로딩 중...</div>
      </div>
    );
  }

  // 시작 화면
  if (gameState === "idle") {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Clock className="text-accent" size={28} />
            <h2 className="text-2xl font-black text-white font-serif">연대기</h2>
          </div>
          <p className="text-sm text-text-secondary">셀럽 생년 순서 맞추기</p>
          <div className="w-24 h-px bg-accent/20 mx-auto mt-6 shadow-glow" />
        </div>

          <div className="bg-white/5 rounded-lg p-4 mb-6 text-sm text-text-secondary space-y-2">
            <p>1. 연대기에 셀럽 카드가 하나 놓여있습니다</p>
            <p>2. 새 카드가 나오면 생년 기준 올바른 위치에 배치하세요</p>
            <p>3. 틀리면 게임 오버!</p>
          </div>

          <p className="text-xs text-text-tertiary text-center mb-2">난이도를 선택하여 게임 시작</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => startGame("easy")}
              disabled={allCelebs.length < 5}
              className="p-4 bg-white/5 hover:bg-white/10 border border-border hover:border-accent/50 rounded-lg disabled:opacity-50"
            >
              <div className="font-bold text-white">쉬움</div>
              <p className="text-xs text-text-tertiary mt-1">카드 탭으로 정보 확인</p>
            </button>
            <button
              onClick={() => startGame("hard")}
              disabled={allCelebs.length < 5}
              className="p-4 bg-white/5 hover:bg-white/10 border border-border hover:border-accent/50 rounded-lg disabled:opacity-50"
            >
              <div className="font-bold text-white">어려움</div>
              <p className="text-xs text-text-tertiary mt-1">연대 정보 숨김</p>
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

  // 게임 진행
  return (
    <div className="max-w-4xl mx-auto flex flex-col">
      {/* 공통 헤더 */}
      <GameHeader
        difficulty={difficulty}
        difficultyLabel={isEasyMode ? "쉬움" : "어려움"}
        streak={streak}
        highScore={highScore}
        remaining={remainingCelebs.length}
      />

      {/* 상단: 현재 카드 영역 */}
      {currentCard && (
        <div className="flex flex-col items-center py-6 mb-4">
          <p className="text-text-secondary text-sm mb-4">이 셀럽을 연대기에 배치하세요</p>
          <TimelineCard
            celeb={currentCard}
            showYear={isRevealing || gameState === "gameover"}
            size="large"
            isNew={!isRevealing}
            isWrong={wrongPosition !== null}
            onClick={() => setSelectedCeleb(currentCard)}
            clickable={isEasyMode}
          />
          {/* 결과/힌트 영역 - 고정 높이 */}
          <div className="h-12 flex items-center justify-center mt-2">
            {isRevealing && wrongPosition === null && (
              <p className="text-green-500 font-bold text-lg">정답!</p>
            )}
            {wrongPosition !== null && (
              <p className="text-red-500 font-bold text-lg">
                오답! 정답: {formatYear(currentCard.birthYear)}
              </p>
            )}
            {!isRevealing && isEasyMode && (
              <p className="text-xs text-text-tertiary">카드를 탭하여 상세 보기</p>
            )}
          </div>
        </div>
      )}

      {/* 하단: 타임라인 영역 */}
      <div className="relative md:bg-bg-card/50 md:rounded-xl md:border md:border-border md:p-4 py-4">
        {/* 모바일용 수평선 (상/하단) */}
        <div className="absolute top-0 left-0 right-0 h-px bg-border md:hidden" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-border md:hidden" />
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-text-tertiary" />
          <span className="text-xs text-text-tertiary">과거</span>
          <div className="flex-1 h-px bg-gradient-to-r from-text-tertiary/30 to-text-tertiary/30" />
          <span className="text-xs text-text-tertiary">현재</span>
        </div>

        {/* 스크롤 버튼 */}
        {timeline.length > 2 && (
          <>
            <button
              onClick={() => scrollTimeline("left")}
              className="absolute start-2 top-1/2 translate-y-2 z-10 p-2 bg-bg-card/90 rounded-full border border-border hover:bg-white/10"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scrollTimeline("right")}
              className="absolute end-2 top-1/2 translate-y-2 z-10 p-2 bg-bg-card/90 rounded-full border border-border hover:bg-white/10"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* 타임라인 */}
        <div
          ref={timelineRef}
          className="flex items-center gap-1.5 md:gap-2 overflow-x-auto pb-2 scrollbar-hidden px-6 md:px-8"
        >
          {/* 맨 앞 배치 슬롯 */}
          <PlacementSlot
            onClick={() => handlePlace(0)}
            disabled={isRevealing}
            position="start"
          />

          {timeline.map((celeb, idx) => (
            <div key={celeb.id} className="flex items-center gap-1.5 md:gap-2">
              <TimelineCard
                celeb={celeb}
                showYear={isEasyMode || gameState === "gameover"}
                size="small"
                onClick={() => setSelectedCeleb(celeb)}
                clickable={isEasyMode}
              />

              {/* 사이 배치 슬롯 */}
              <PlacementSlot
                onClick={() => handlePlace(idx + 1)}
                disabled={isRevealing}
                position={idx === timeline.length - 1 ? "end" : "middle"}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 결과 모달 */}
      <ResultModal
        isOpen={gameState === "gameover"}
        streak={streak}
        highScore={highScore}
        onRestart={() => setGameState("idle")}
      />

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
// endregion
