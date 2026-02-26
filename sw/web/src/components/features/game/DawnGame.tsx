/*
  파일명: components/features/game/DawnGame.tsx
  기능: 여명(Dawn) 게임 메인 컴포넌트
  책임: 셀럽 생년을 시간순으로 배치하는 게임
  업데이트: Neo-Pantheon 디자인 적용 (DawnQuizCard + DawnBoardCard)
*/
"use client";

import { useState, useEffect, useCallback, useRef, type MutableRefObject } from "react";
import { getCelebs } from "@/actions/home/getCelebs";
import type { CelebProfile } from "@/types/home";
import { ChevronLeft, ChevronRight, Heart, Flame, Eye } from "lucide-react";
import EyeOfTime from "./dawn/EyeOfTime";
import { isPublicDomainCeleb, getCentury } from "./utils";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";
import DawnBoardCard from "./dawn/DawnBoardCard";
import DawnResult from "./dawn/DawnResult";
import { cn } from "@/lib/utils";

type GameState = "idle" | "playing" | "gameover";
type Difficulty = "easy" | "hard";
type HintType = "century" | "highlight" | "eliminate" | null;

const INITIAL_LIVES = 3;
const INITIAL_TORCHES = 2;

interface DawnCeleb extends CelebProfile {
  birthYear: number;
}

// region: 연도 파싱 유틸
function parseBirthYear(birthDate: string | null): number | null {
  if (!birthDate) return null;

  const bcMatch = birthDate.match(/(?:BC|기원전)\s*(\d+)/i);
  if (bcMatch) return -parseInt(bcMatch[1], 10);

  if (birthDate.startsWith("-")) {
    const n = parseInt(birthDate.slice(1), 10);
    return isNaN(n) ? null : -n;
  }

  const yearMatch = birthDate.match(/^(\d{1,4})/);
  if (yearMatch) return parseInt(yearMatch[1], 10);

  return null;
}

function formatYear(year: number): string {
  if (year < 0) return `BC ${Math.abs(year)}`;
  return `AD ${year}`;
}
// endregion

// region: 배치 슬롯 컴포넌트
// 모바일: 가로 납작 (h-6, 세로 보드 사이) / 데스크탑: 세로 (w-20 h-32, 가로 보드 사이)
function PlacementSlot({
  onClick,
  disabled,
  position,
  isActive,
  isCorrectReveal,
  isEliminated,
}: {
  onClick: () => void;
  disabled: boolean;
  position: "start" | "middle" | "end";
  isActive?: boolean;
  isCorrectReveal?: boolean;
  isEliminated?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      onTouchEnd={(e) => e.currentTarget.blur()}
      disabled={disabled || isEliminated}
      className={cn(
        "group relative flex-shrink-0 flex items-center justify-center",
        "w-full h-6 md:w-20 md:h-32",
        "touch-pan-y md:touch-pan-x",
        isEliminated
          ? "cursor-not-allowed opacity-30"
          : disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      )}
    >
      <div className={cn(
        "absolute rounded transition-all duration-300",
        "inset-y-0.5 inset-x-2 md:inset-x-2 md:inset-y-0 md:top-4 md:bottom-4",
        isCorrectReveal
          ? "border-2 border-green-400/80 bg-green-400/20 shadow-[0_0_12px_rgba(74,222,128,0.3)]"
          : isActive
            ? "border-2 border-accent/60 bg-accent/10"
            : isEliminated
              ? "border-2 border-white/10 bg-white/5"
              : "border-2 border-dashed border-accent/20 [@media(hover:hover)]:group-hover:border-accent/40"
      )}>
        <div className="absolute inset-0 flex items-center justify-center">
          {isEliminated ? (
            <span className="text-xs md:text-xl font-bold text-white/20">X</span>
          ) : (
            <span className="text-xs md:text-xl font-bold text-accent opacity-0 [@media(hover:hover)]:group-hover:opacity-100">+</span>
          )}
        </div>
      </div>
    </button>
  );
}
// endregion

interface DawnGameProps {
  onEnterFullScreen?: () => void;
  onHomeRef?: MutableRefObject<(() => void) | null>;
  onPhaseChange?: (phase: string) => void;
  onStartRef?: MutableRefObject<((difficulty: "easy" | "hard") => void) | null>;
}

export default function DawnGame({ onEnterFullScreen, onHomeRef, onPhaseChange, onStartRef }: DawnGameProps = {}) {
  const [allCelebs, setAllCelebs] = useState<DawnCeleb[]>([]);
  const [board, setBoard] = useState<DawnCeleb[]>([]);
  const [currentCard, setCurrentCard] = useState<DawnCeleb | null>(null);
  const [remainingCelebs, setRemainingCelebs] = useState<DawnCeleb[]>([]);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [isRevealing, setIsRevealing] = useState(false);
  const [wrongPosition, setWrongPosition] = useState<number | null>(null);
  const [correctPosition, setCorrectPosition] = useState<number | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [selectedCeleb, setSelectedCeleb] = useState<DawnCeleb | null>(null);
  const [pendingBoard, setPendingBoard] = useState<DawnCeleb[] | null>(null);
  const [pendingPlaceIndex, setPendingPlaceIndex] = useState<number | null>(null);

  // 라이프 & 힌트
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [torches, setTorches] = useState(INITIAL_TORCHES);
  const [activeHint, setActiveHint] = useState<HintType>(null);
  const [centuryText, setCenturyText] = useState<string | null>(null);
  const [highlightedIndices, setHighlightedIndices] = useState<number[]>([]);
  const [eliminatedSlots, setEliminatedSlots] = useState<number[]>([]);
  const [lostLifeAnim, setLostLifeAnim] = useState(false);
  const [hintAnnounce, setHintAnnounce] = useState<{ type: HintType; label: string; icon: string } | null>(null);
  const [eyeOfTimeOpen, setEyeOfTimeOpen] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const scrollStartXRef = useRef(0);
  const isEasyMode = difficulty === "easy";
  const isNewRecord = streak === highScore && streak > 0;
  const isGameOver = gameState === "gameover";

  // region: 마우스 드래그 가로 스크롤
  const handleBoardMouseDown = useCallback((e: React.MouseEvent) => {
    if (!boardRef.current) return;
    e.preventDefault(); // 이미지 네이티브 드래그 방지
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    scrollStartXRef.current = boardRef.current.scrollLeft;
    document.body.style.userSelect = "none";
    boardRef.current.style.cursor = "grabbing";
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !boardRef.current) return;
      const delta = dragStartXRef.current - e.clientX;
      boardRef.current.scrollLeft = scrollStartXRef.current + delta;
    };
    const onUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.userSelect = "";
      if (boardRef.current) boardRef.current.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);
  // endregion

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
        .filter((c): c is DawnCeleb => c !== null);

      setAllCelebs(withBirthYear);
      setIsDataLoaded(true);

      const saved = localStorage.getItem("dawn-highscore");
      if (saved) setHighScore(parseInt(saved, 10));
    };
    loadCelebs();
  }, []);
  // endregion

  // 래퍼 연동: gameState 변경 알림
  useEffect(() => { onPhaseChange?.(gameState); }, [gameState, onPhaseChange]);

  // 래퍼 연동: 홈 → idle 복귀
  useEffect(() => {
    if (onHomeRef) onHomeRef.current = () => setGameState("idle");
  }, [onHomeRef]);

  // region: 게임 시작
  const startGame = useCallback(
    (selectedDifficulty: Difficulty) => {
      if (allCelebs.length < 5) return;

      setDifficulty(selectedDifficulty);

      const shuffled = [...allCelebs].sort(() => Math.random() - 0.5);
      const [first, second, ...rest] = shuffled;

      setBoard([first]);
      setCurrentCard(second);
      setRemainingCelebs(rest);
      setStreak(0);
      setLives(INITIAL_LIVES);
      setTorches(INITIAL_TORCHES);
      setActiveHint(null);
      setCenturyText(null);
      setHighlightedIndices([]);
      setEliminatedSlots([]);
      setGameState("playing");
      setIsRevealing(false);
      setWrongPosition(null);
      setCorrectPosition(null);
    },
    [allCelebs]
  );

  // 래퍼 연동: 외부에서 startGame 호출
  useEffect(() => {
    if (onStartRef) onStartRef.current = startGame;
  }, [onStartRef, startGame]);
  // endregion

  // region: 배치 헬퍼
  const clearHintState = () => {
    setActiveHint(null);
    setCenturyText(null);
    setHighlightedIndices([]);
    setEliminatedSlots([]);
  };

  const placeCorrect = (index: number) => {
    if (!currentCard) return;
    const newBoard = [...board];
    newBoard.splice(index, 0, currentCard);
    setCorrectPosition(index);
    setPendingBoard(newBoard);
    setPendingPlaceIndex(index);

    setStreak((prev) => {
      const next = prev + 1;
      if (next > highScore) {
        setHighScore(next);
        localStorage.setItem("dawn-highscore", next.toString());
      }
      return next;
    });
  };

  const placeWrong = (correctIndex: number) => {
    if (!currentCard) return;
    setCorrectPosition(correctIndex);

    const newLives = lives - 1;
    setLives(newLives);
    setLostLifeAnim(true);
    setTimeout(() => setLostLifeAnim(false), 1500);

    setTimeout(() => {
      if (newLives <= 0) {
        setGameState("gameover");
        setIsRevealing(false);
      } else {
        const newBoard = [...board];
        newBoard.splice(correctIndex, 0, currentCard);
        setBoard(newBoard);
        setWrongPosition(null);
        setCorrectPosition(null);

        if (remainingCelebs.length === 0) {
          setGameState("gameover");
        } else {
          const [next, ...rest] = remainingCelebs;
          setCurrentCard(next);
          setRemainingCelebs(rest);
        }
        setIsRevealing(false);
      }
    }, 2000);
  };
  // endregion

  // region: 배치 선택
  const handlePlace = (index: number) => {
    if (!currentCard || gameState !== "playing" || isRevealing) return;

    const foundCorrectIndex = board.findIndex((c) => c.birthYear > currentCard.birthYear);
    const actualCorrectIndex = foundCorrectIndex === -1 ? board.length : foundCorrectIndex;

    const isCorrect = index === actualCorrectIndex;
    setIsRevealing(true);
    clearHintState();

    if (isCorrect) {
      placeCorrect(index);
    } else {
      setWrongPosition(index);
      placeWrong(actualCorrectIndex);
    }
  };
  // endregion

  // region: 힌트 사용
  const HINT_META: Record<Exclude<HintType, null>, { label: string; icon: string }> = {
    century: { label: "세기 공개", icon: "📜" },
    highlight: { label: "위치 힌트", icon: "✨" },
    eliminate: { label: "슬롯 제거", icon: "🚫" },
  };

  const useHint = useCallback(() => {
    if (!currentCard || torches <= 0 || isRevealing || gameState !== "playing" || hintAnnounce) return;

    const foundCorrectIndex = board.findIndex((c) => c.birthYear > currentCard.birthYear);
    const actualCorrectIndex = foundCorrectIndex === -1 ? board.length : foundCorrectIndex;
    const slotCount = board.length + 1;

    // 사용 가능한 힌트 종류 결정
    const available: HintType[] = ["century"];
    if (board.length >= 2) available.push("highlight");
    if (slotCount >= 4) available.push("eliminate");

    const chosen = available[Math.floor(Math.random() * available.length)]!;
    setTorches((t) => t - 1);

    // 1단계: 안내 오버레이 표시
    setHintAnnounce({ type: chosen, ...HINT_META[chosen] });

    // 2단계: 1.2초 후 안내 닫고 힌트 적용 + 스크롤
    setTimeout(() => {
      setHintAnnounce(null);
      setActiveHint(chosen);

      if (chosen === "century") {
        setCenturyText(getCentury(currentCard.birthYear));
      } else if (chosen === "highlight") {
        const indices: number[] = [];
        if (actualCorrectIndex > 0) indices.push(actualCorrectIndex - 1);
        if (actualCorrectIndex < board.length) indices.push(actualCorrectIndex);
        setHighlightedIndices(indices);

        // 하이라이트된 카드 위치로 스크롤
        const scrollTarget = (indices[0] ?? actualCorrectIndex) * 140;
        setTimeout(() => {
          boardRef.current?.scrollTo({ left: Math.max(0, scrollTarget - 100), behavior: "smooth" });
        }, 100);
      } else if (chosen === "eliminate") {
        const wrongSlots = Array.from({ length: slotCount }, (_, i) => i)
          .filter((i) => i !== actualCorrectIndex);
        const shuffled = wrongSlots.sort(() => Math.random() - 0.5);
        const eliminated = shuffled.slice(0, 2);
        setEliminatedSlots(eliminated);

        // 제거되지 않은 슬롯 중 첫 번째 위치로 스크롤
        const remainingSlots = Array.from({ length: slotCount }, (_, i) => i)
          .filter((i) => !eliminated.includes(i));
        if (remainingSlots.length > 0) {
          const scrollTarget = remainingSlots[0] * 140;
          setTimeout(() => {
            boardRef.current?.scrollTo({ left: Math.max(0, scrollTarget - 100), behavior: "smooth" });
          }, 100);
        }
      }
    }, 1200);
  }, [currentCard, torches, isRevealing, gameState, board, hintAnnounce]);
  // endregion

  // region: 정답 처리 - 자동으로 다음 라운드 진행
  const proceedToNextRound = useCallback(() => {
    if (!pendingBoard || pendingPlaceIndex === null) return;

    setBoard(pendingBoard);
    setCorrectPosition(null);

    if (remainingCelebs.length === 0) {
      setGameState("gameover");
    } else {
      const [next, ...rest] = remainingCelebs;
      setCurrentCard(next);
      setRemainingCelebs(rest);
    }
    setIsRevealing(false);
    setPendingBoard(null);

    setTimeout(() => {
      boardRef.current?.scrollTo({
        left: pendingPlaceIndex * 140,
        behavior: "smooth",
      });
      setPendingPlaceIndex(null);
    }, 100);
  }, [pendingBoard, pendingPlaceIndex, remainingCelebs]);

  useEffect(() => {
    if (isRevealing && wrongPosition === null && pendingBoard) {
      const timer = setTimeout(() => {
        proceedToNextRound();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isRevealing, wrongPosition, pendingBoard, proceedToNextRound]);
  // endregion

  // region: 스크롤 버튼
  const scrollBoard = (direction: "left" | "right") => {
    if (!boardRef.current) return;
    const scrollAmount = 300;
    boardRef.current.scrollBy({
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

  // idle — 래퍼가 로비를 렌더링하므로 null 반환
  if (gameState === "idle") {
    return null;
  }

  const showCorrectEffect = isRevealing && wrongPosition === null;
  const showWrongEffect = wrongPosition !== null;

  return (
    <div className={cn(
      "w-full md:max-w-6xl mx-auto flex flex-col h-full overflow-hidden transition-colors duration-300",
      showCorrectEffect && "bg-green-900/20",
      showWrongEffect && "bg-red-900/20"
    )}>
      {/* ===== 모바일: 2열 레이아웃 / 데스크탑: 기존 세로 레이아웃 ===== */}

      {/* 데스크탑 전용: 좌측 플로팅 체력 */}
      <div className={cn(
        "hidden md:flex absolute left-6 top-18 z-30 flex-col items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-xl px-2 py-2.5 border border-white/10",
        lostLifeAnim && "animate-shake"
      )}>
        {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
          <Heart
            key={i}
            size={18}
            className={cn(
              "transition-all duration-300",
              i < lives
                ? "text-red-400 fill-red-400 drop-shadow-[0_0_4px_rgba(248,113,113,0.5)]"
                : "text-white/20"
            )}
          />
        ))}
      </div>

      {/* 데스크탑 전용: 우측 플로팅 점수+남은+횃불 */}
      <div className="hidden md:flex absolute right-6 top-18 z-30 flex-col items-center gap-2 bg-black/50 backdrop-blur-sm rounded-xl px-2.5 py-2.5 border border-white/10">
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-text-tertiary font-cinzel tracking-wider uppercase">점수</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-base font-serif font-black text-white leading-none">{streak}</span>
            <span className="text-[10px] text-text-secondary">/</span>
            <span className="text-base font-serif font-black text-accent leading-none">{highScore}</span>
          </div>
        </div>
        <div className="w-6 h-px bg-white/10" />
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-text-tertiary font-cinzel tracking-wider uppercase">남은</span>
          <span className="text-base font-serif font-black text-white leading-none">{remainingCelebs.length}</span>
        </div>
        <div className="w-6 h-px bg-white/10" />
        <button
          onClick={useHint}
          disabled={torches <= 0 || isRevealing || gameState !== "playing" || !!hintAnnounce}
          className={cn(
            "flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-all",
            torches > 0 && !isRevealing && !hintAnnounce
              ? "text-orange-400 hover:bg-orange-500/20 cursor-pointer active:scale-95"
              : "text-white/20 cursor-not-allowed"
          )}
        >
          <Flame size={18} className={torches > 0 ? "drop-shadow-[0_0_4px_rgba(251,146,60,0.5)]" : ""} />
          <span className="text-[10px] font-bold">{torches}</span>
        </button>
      </div>

      {/* 메인 영역: 모바일 flex-row 2열 / 데스크탑 세로 중앙 */}
      <div className="flex flex-row md:flex-col md:items-center md:justify-center w-full flex-1 min-h-0 h-0 md:h-auto gap-2 md:gap-0 pt-12 pb-2 md:pt-0 md:pb-0 px-2 md:px-0">

        {/* ── 모바일 통합 상단 헤더 바 ── */}
        <div className={cn(
          "md:hidden fixed top-11 left-2 right-2 z-30 flex items-center justify-between bg-black/60 backdrop-blur-md rounded-lg px-3 py-1 border border-white/10",
          lostLifeAnim && "animate-shake"
        )}>
          {/* 하트 */}
          <div className="flex items-center gap-1">
            {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
              <Heart
                key={i}
                size={14}
                className={cn(
                  "transition-all duration-300",
                  i < lives ? "text-red-400 fill-red-400" : "text-white/20"
                )}
              />
            ))}
          </div>
          {/* 점수 */}
          <div className="flex items-baseline gap-0.5">
            <span className="text-sm font-serif font-black text-white leading-none">{streak}</span>
            <span className="text-[9px] text-text-secondary">/</span>
            <span className="text-sm font-serif font-black text-accent leading-none">{highScore}</span>
          </div>
          {/* 남은 */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-text-tertiary">남은</span>
            <span className="text-sm font-serif font-black text-white leading-none">{remainingCelebs.length}</span>
          </div>
          {/* 횃불 */}
          <button
            onClick={useHint}
            disabled={torches <= 0 || isRevealing || gameState !== "playing" || !!hintAnnounce}
            className={cn(
              "flex items-center gap-1 transition-all",
              torches > 0 && !isRevealing && !hintAnnounce
                ? "text-orange-400 active:scale-95"
                : "text-white/20 cursor-not-allowed"
            )}
          >
            <Flame size={14} className={torches > 0 ? "drop-shadow-[0_0_4px_rgba(251,146,60,0.5)]" : ""} />
            <span className="text-xs font-bold">{torches}</span>
          </button>
        </div>

        {/* ── 모바일: 시간의 눈 (헤더 바 아래) ── */}
        {!isRevealing && !isGameOver && currentCard && (
          <button
            onClick={() => setEyeOfTimeOpen(true)}
            className="md:hidden fixed top-[4rem] left-2 right-2 z-30 flex items-center justify-center gap-1.5 py-1 rounded-lg bg-purple-600/30 backdrop-blur-sm hover:bg-purple-500/40 border border-purple-400/20 text-purple-300 text-[10px] font-serif font-bold transition-all active:scale-95"
          >
            <Eye size={12} />
            시간의 눈
          </button>
        )}

        {/* ── 좌측 1열: 퀴즈 카드 (모바일 fixed 세로 중앙) ── */}
        {currentCard && (
          <div className="fixed left-[2%] w-[46%] top-1/2 -translate-y-1/2 md:static md:w-auto md:top-auto md:translate-y-0 md:left-auto z-20 animate-in fade-in slide-in-from-top-4 duration-500 md:mb-6">
            <DawnBoardCard
              imageUrl={currentCard.avatar_url}
              name={currentCard.nickname}
              year={
                (isRevealing || isGameOver)
                  ? formatYear(currentCard.birthYear)
                  : centuryText || "????"
              }
              profession={currentCard.profession}
              className="w-full md:w-44"
              onInfoClick={() => setSelectedCeleb(currentCard)}
            />

            {/* 데스크탑: 시간의 눈 */}
            {!isRevealing && !isGameOver && (
              <button
                onClick={() => setEyeOfTimeOpen(true)}
                className="hidden md:flex mt-2 items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-500/40 border border-purple-400/20 text-purple-300 text-xs font-serif font-bold transition-all active:scale-95"
              >
                <Eye size={14} />
                시간의 눈
              </button>
            )}
          </div>
        )}

        {/* ── 우측 2열: 보드 (모바일 fixed 세로 중앙) / 하단 (데스크탑) ── */}
        <div className="fixed right-[2%] top-1/2 -translate-y-1/2 w-[46%] max-h-[70vh] md:static md:w-full md:top-auto md:translate-y-0 md:right-auto md:max-h-none z-20 overflow-hidden md:overflow-visible bg-black/70 border border-white/10 backdrop-blur-md rounded-xl md:rounded-2xl flex flex-col">

          {/* 장식용 레일 */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

          {/* 좌우 이동 버튼 + 시대 라벨 (데스크탑) */}
          <div className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-1">
            <span className="text-[9px] text-accent/50 font-cinzel tracking-wider">고대</span>
            <button
              onClick={() => scrollBoard("left")}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 border border-white/20 hover:bg-white/10 hover:border-accent text-white transition-all"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
          <div className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-1">
            <span className="text-[9px] text-accent/50 font-cinzel tracking-wider">현대</span>
            <button
              onClick={() => scrollBoard("right")}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 border border-white/20 hover:bg-white/10 hover:border-accent text-white transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* 시대 방향 라벨 — 상단(고대) */}
          <div className="shrink-0 flex md:hidden items-center justify-center gap-1 py-0.5 text-[9px] text-accent/50 font-cinzel tracking-widest">
            <span>▲</span><span>고대</span>
          </div>

          {/* 스크롤 영역 — 모바일: 세로 / 데스크탑: 가로 */}
          <div
            ref={boardRef}
            onMouseDown={handleBoardMouseDown}
            className="overflow-y-auto overflow-x-hidden md:overflow-y-hidden md:overflow-x-auto p-2 md:py-8 md:text-center scrollbar-hide touch-pan-y md:touch-pan-x cursor-grab flex-1 min-h-0 md:flex-none md:h-auto"
          >
            <div className="flex flex-col md:inline-flex md:flex-row items-center gap-0 md:gap-0 md:px-8">
              {/* Start Slot */}
              <PlacementSlot
                position="start"
                onClick={() => handlePlace(0)}
                disabled={isRevealing || isGameOver}
                isActive={correctPosition === 0 && !showWrongEffect}
                isCorrectReveal={showWrongEffect && correctPosition === 0}
                isEliminated={eliminatedSlots.includes(0)}
              />

              {/* 모바일: 슬롯→카드 연결선 (세로) */}
              <div className="w-px h-2 bg-white/20 md:hidden" />

              {/* 배치된 카드들 */}
              {board.map((celeb, index) => (
                <div key={celeb.id} className="flex flex-col md:flex-row items-center gap-0 snap-center w-full md:w-auto">
                  {/* 데스크탑: 좌측 연결선 */}
                  <div className="hidden md:block w-3 h-px bg-white/20 shrink-0" />

                  {/* 카드 본체 */}
                  <DawnBoardCard
                    imageUrl={celeb.avatar_url}
                    name={celeb.nickname}
                    year={formatYear(celeb.birthYear)}
                    profession={celeb.profession}
                    isHighlighted={highlightedIndices.includes(index)}
                    className="w-full md:w-40 shrink-0"
                    onInfoClick={() => setSelectedCeleb(celeb)}
                  />

                  {/* 데스크탑: 우측 연결선 */}
                  <div className="hidden md:block w-3 h-px bg-white/20 shrink-0" />
                  {/* 모바일: 카드→슬롯 연결선 (세로) */}
                  <div className="w-px h-2 bg-white/20 md:hidden" />

                  {/* 사이 슬롯 */}
                  <PlacementSlot
                    position={index === board.length - 1 ? "end" : "middle"}
                    onClick={() => handlePlace(index + 1)}
                    disabled={isRevealing || isGameOver}
                    isActive={correctPosition === index + 1 && !showWrongEffect}
                    isCorrectReveal={showWrongEffect && correctPosition === index + 1}
                    isEliminated={eliminatedSlots.includes(index + 1)}
                  />

                  {/* 모바일: 슬롯→다음카드 연결선 (마지막 제외) */}
                  {index < board.length - 1 && (
                    <div className="w-px h-2 bg-white/20 md:hidden" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 시대 방향 라벨 — 하단(현대) */}
          <div className="shrink-0 flex md:hidden items-center justify-center gap-1 py-0.5 text-[9px] text-accent/50 font-cinzel tracking-widest">
            <span>현대</span><span>▼</span>
          </div>
        </div>
      </div>{/* 메인 영역 끝 */}

      {/* 힌트 안내 오버레이 */}
      {hintAnnounce && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative flex flex-col items-center gap-3 animate-in zoom-in-75 fade-in duration-300">
            <span className="text-5xl md:text-6xl">{hintAnnounce.icon}</span>
            <span className="text-xl md:text-2xl font-serif font-black text-orange-300 drop-shadow-[0_0_20px_rgba(251,146,60,0.5)]">
              {hintAnnounce.label}
            </span>
            <Flame size={20} className="text-orange-400/60 animate-pulse" />
          </div>
        </div>
      )}

      {/* 오답 시 중앙 라이프 감소 연출 */}
      {lostLifeAnim && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          {/* 빨간 비네트 */}
          <div className="absolute inset-0 animate-in fade-in duration-200" style={{
            background: "radial-gradient(ellipse at center, transparent 30%, rgba(220,38,38,0.25) 100%)",
          }} />
          {/* 하트 + 남은 체력 */}
          <div className="flex flex-col items-center gap-2 animate-in zoom-in-75 fade-in duration-300">
            <Heart size={64} className="text-red-500 fill-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.7)] animate-pulse" />
            <div className="flex items-center gap-1.5">
              {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
                <Heart
                  key={i}
                  size={24}
                  className={cn(
                    i < lives
                      ? "text-red-400 fill-red-400"
                      : "text-white/20"
                  )}
                />
              ))}
            </div>
            <span className="text-sm font-serif font-bold text-red-300 mt-1">
              {lives > 0 ? `체력 ${lives}/${INITIAL_LIVES}` : "체력 소진!"}
            </span>
          </div>
        </div>
      )}

      {/* 시간의 눈 오버레이 */}
      {eyeOfTimeOpen && currentCard && (
        <EyeOfTime
          boardYears={board.map((c) => c.birthYear)}
          correctYear={currentCard.birthYear}
          celebName={currentCard.nickname}
          onPerfect={() => {
            setEyeOfTimeOpen(false);
            setIsRevealing(true);
            clearHintState();
            const foundIdx = board.findIndex((c) => c.birthYear > currentCard.birthYear);
            const correctIdx = foundIdx === -1 ? board.length : foundIdx;
            placeCorrect(correctIdx);
            setTorches((t) => Math.min(t + 1, INITIAL_TORCHES + 2));
          }}
          onGood={(correctIdx) => {
            setEyeOfTimeOpen(false);
            setIsRevealing(true);
            clearHintState();
            placeCorrect(correctIdx);
          }}
          onMiss={() => {
            setEyeOfTimeOpen(false);
            setIsRevealing(true);
            clearHintState();
            const foundIdx = board.findIndex((c) => c.birthYear > currentCard.birthYear);
            const correctIdx = foundIdx === -1 ? board.length : foundIdx;
            placeWrong(correctIdx);
          }}
          onCancel={() => setEyeOfTimeOpen(false)}
        />
      )}

      {/* 게임오버 - 결과 */}
      {isGameOver && (
        <DawnResult
          board={board}
          currentCard={currentCard}
          streak={streak}
          lives={lives}
          isNewRecord={isNewRecord}
          onReplay={() => setGameState("idle")}
        />
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
