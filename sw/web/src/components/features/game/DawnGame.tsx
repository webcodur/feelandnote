/*
  파일명: components/features/game/DawnGame.tsx
  기능: 여명(Dawn) 게임 메인 컴포넌트
  책임: 셀럽 생년을 시간순으로 배치하는 게임
  업데이트: Neo-Pantheon 디자인 적용 (DawnQuizCard + DawnBoardCard)
*/
"use client";

import { useState, useEffect, useCallback, useRef, useMemo, type MutableRefObject } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getCelebs } from "@/actions/home/getCelebs";
import { getDawnDialogues, type DawnDialogueData } from "@/actions/game/getDawnDialogues";
import type { CelebProfile } from "@/types/home";
import { ChevronLeft, ChevronRight, Heart, Flame, Eye } from "lucide-react";
import EyeOfTime from "./dawn/EyeOfTime";
import { isPublicDomainCeleb, getCentury } from "./utils";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";
import DawnBoardCard from "./dawn/DawnBoardCard";
import DawnResult from "./dawn/DawnResult";
import { useDialogue, useDialogueSubtitle, type DialogueSubtitleData } from "./shared/hooks/useDialogue";
import type { SpeechTone, DialogueLines } from "@/lib/game/voice/types";
import { validateSpeechTone } from "@/lib/game/voice/speechTone";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/constants/zIndex";


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
// 가로 보드 사이 세로 슬롯
function PlacementSlot({
  onClick,
  disabled,
  position,
  isActive,
  isCorrectReveal,
  isEliminated,
  isExpanding,
  isCollapsed,
  expandingSize,
  slotIndex,
}: {
  onClick: () => void;
  disabled: boolean;
  position: "start" | "middle" | "end";
  isActive?: boolean;
  isCorrectReveal?: boolean;
  isEliminated?: boolean;
  isExpanding?: boolean;
  isCollapsed?: boolean;
  expandingSize?: { width: number; height: number } | null;
  slotIndex: number;
}) {
  return (
    <button
      data-slot-index={slotIndex}
      onClick={onClick}
      onTouchEnd={(e) => e.currentTarget.blur()}
      disabled={disabled || isEliminated}
      className={cn(
        "group relative flex-shrink-0 flex items-center justify-center",
        "touch-pan-x",
        "transition-[width,height,opacity] duration-300 ease-out",
        !isExpanding && !isCollapsed && "w-14 h-24 md:w-20 md:h-32",
        isEliminated
          ? "cursor-not-allowed opacity-30"
          : disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      )}
      style={
        isExpanding && expandingSize
          ? { width: expandingSize.width, height: expandingSize.height }
          : isCollapsed
            ? { width: 0, height: 0, overflow: "hidden", opacity: 0, transition: "none" }
            : undefined
      }
    >
      <div className={cn(
        "absolute rounded transition-[inset,border-color,background-color,box-shadow] duration-300",
        isExpanding
          ? "inset-2 border-2 border-dashed border-accent/50 bg-accent/5 rounded-xl shadow-[0_0_12px_rgba(212,175,55,0.15)]"
          : cn(
              "inset-x-2 top-4 bottom-4",
              isCorrectReveal
                ? "border-2 border-green-400/80 bg-green-400/20 shadow-[0_0_12px_rgba(74,222,128,0.3)]"
                : isActive
                  ? "border-2 border-accent/60 bg-accent/10"
                  : isEliminated
                    ? "border-2 border-white/10 bg-white/5"
                    : "border-2 border-dashed border-accent/20 [@media(hover:hover)]:group-hover:border-accent/40"
            )
      )}>
        <div className="absolute inset-0 flex items-center justify-center">
          {isEliminated ? (
            <span className="text-base md:text-xl font-bold text-white/20">X</span>
          ) : (
            <span className={cn(
              "text-base md:text-xl font-bold text-accent transition-opacity duration-300",
              isExpanding ? "opacity-100" : "opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
            )}>+</span>
          )}
        </div>
      </div>
    </button>
  );
}
// endregion

// endregion (BoardCardRow 삭제 — 비행 오버레이가 시각적 전환 담당, maxHeight 진입 애니메이션 불필요)

interface DawnGameProps {
  onEnterFullScreen?: () => void;
  onHomeRef?: MutableRefObject<(() => void) | null>;
  onPhaseChange?: (phase: string) => void;
  onStartRef?: MutableRefObject<((difficulty: "easy" | "hard") => void) | null>;
}

export default function DawnGame({ onEnterFullScreen, onHomeRef, onPhaseChange, onStartRef }: DawnGameProps = {}) {
  const locale = useLocale();
  const tDawnGame = useTranslations("rest.arena.dawn.game");
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
  const pendingDifficultyRef = useRef<Difficulty | null>(null);
  const [selectedCeleb, setSelectedCeleb] = useState<DawnCeleb | null>(null);
  const [pendingBoard, setPendingBoard] = useState<DawnCeleb[] | null>(null);
  const [pendingPlaceIndex, setPendingPlaceIndex] = useState<number | null>(null);
  const [newlyPlacedIndex, setNewlyPlacedIndex] = useState<number | null>(null);
  const [nextCardKey, setNextCardKey] = useState(0);
  const [quizCardHidden, setQuizCardHidden] = useState(false);
  const [expandingSlotIndex, setExpandingSlotIndex] = useState<number | null>(null);
  const [expandingSize, setExpandingSize] = useState<{ width: number; height: number } | null>(null);
  const [collapsedSlots, setCollapsedSlots] = useState<number[]>([]);
  const [nextCardRevealed, setNextCardRevealed] = useState(true);

  // 라이프 & 힌트
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [torches, setTorches] = useState(INITIAL_TORCHES);
  const [activeHint, setActiveHint] = useState<HintType>(null);
  const [centuryText, setCenturyText] = useState<string | null>(null);
  const [highlightedIndices, setHighlightedIndices] = useState<number[]>([]);
  const [eliminatedSlots, setEliminatedSlots] = useState<number[]>([]);
  const [lostLifeAnim, setLostLifeAnim] = useState(false);
  const [hintAnnounce, setHintAnnounce] = useState<{ type: HintType; label: string; icon: string; desc: string } | null>(null);
  const [eyeOfTimeOpen, setEyeOfTimeOpen] = useState(false);
  const [milestoneText, setMilestoneText] = useState<string | null>(null);

  // 대사 시스템
  const [dialogueDataMap, setDialogueDataMap] = useState<Record<string, DawnDialogueData>>({});
  const { handleSubtitle: setSubtitle } = useDialogueSubtitle();
  const sfxMutedRef = useRef(false);
  const subtitleKeyRef = useRef(0);

  const personalDialogues = useMemo(() => {
    const map = new Map<string, DialogueLines>();
    for (const [id, data] of Object.entries(dialogueDataMap)) {
      if (data.dialogueLines) map.set(id, data.dialogueLines as DialogueLines);
    }
    return map;
  }, [dialogueDataMap]);

  // 음성 보유 인물 Set + 버전 Map (CelebProfile 기반)
  const voiceCelebIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of allCelebs) {
      if (c.has_voice) set.add(c.id);
    }
    return set;
  }, [allCelebs]);

  const voiceVersions = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of allCelebs) {
      if (c.has_voice && c.voice_v) map.set(c.id, c.voice_v);
    }
    return map;
  }, [allCelebs]);

  const { showDialogue, showDefaultLine } = useDialogue({
    sfxMutedRef,
    onSubtitle: setSubtitle,
    personalDialogues,
    voiceCelebIds,
    voiceVersions,
  });

  /** 셀럽의 speech_tone을 조회하는 헬퍼 */
  const getTone = useCallback((celebId: string): SpeechTone => {
    return validateSpeechTone(dialogueDataMap[celebId]?.speechTone);
  }, [dialogueDataMap]);

  const boardRef = useRef<HTMLDivElement>(null);
  const quizCardRef = useRef<HTMLDivElement>(null);
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
          if (birthYear === null) return null;
          const nickname = (locale === "en" && c.nickname_en) ? c.nickname_en : c.nickname;
          return { ...c, nickname, birthYear };
        })
        .filter((c): c is DawnCeleb => c !== null);

      setAllCelebs(withBirthYear);

      // 대사 데이터 병렬 조회
      const ids = withBirthYear.map((c) => c.id);
      getDawnDialogues(ids).then(setDialogueDataMap);

      setIsDataLoaded(true);

      const saved = localStorage.getItem("dawn-highscore");
      if (saved) setHighScore(parseInt(saved, 10));
    };
    loadCelebs();
  }, []);
  // endregion

  // 래퍼 연동: gameState + streak 기반 phase 알림
  useEffect(() => {
    if (gameState === "playing" && streak >= 10) {
      onPhaseChange?.("playing-streak");
    } else {
      onPhaseChange?.(gameState);
    }
  }, [gameState, streak, onPhaseChange]);

  // 래퍼 연동: 홈 → idle 복귀
  useEffect(() => {
    if (onHomeRef) onHomeRef.current = () => setGameState("idle");
  }, [onHomeRef]);

  // 퀴즈 카드 등장 시 auto-greeting 제거 (정답 배치 quote와 겹침 방지)
  // 수동 클릭 greeting은 퀴즈 카드의 onInfoClick에서 유지

  // region: 게임 시작
  const startGame = useCallback(
    (selectedDifficulty: Difficulty) => {
      if (allCelebs.length < 5) {
        pendingDifficultyRef.current = selectedDifficulty;
        return;
      }

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
      setNewlyPlacedIndex(null);
      setNextCardKey(0);
      setExpandingSlotIndex(null);
      setExpandingSize(null);
      setCollapsedSlots([]);
      setQuizCardHidden(false);
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

  // 데이터 로드 완료 시 pending 난이도가 있으면 자동 시작
  useEffect(() => {
    if (isDataLoaded && pendingDifficultyRef.current) {
      const d = pendingDifficultyRef.current;
      pendingDifficultyRef.current = null;
      startGame(d);
    }
  }, [isDataLoaded, startGame]);
  // endregion

  // region: 배치 헬퍼
  const clearHintState = () => {
    setActiveHint(null);
    setCenturyText(null);
    setHighlightedIndices([]);
    setEliminatedSlots([]);
  };

  // region: 퀴즈 카드 fade-out (즉시 전환이므로 슬롯 확장 불필요)
  const triggerPlacement = () => {
    setQuizCardHidden(true);
  };
  // endregion

  const placeCorrect = (index: number) => {
    if (!currentCard) return;
    const newBoard = [...board];
    newBoard.splice(index, 0, currentCard);
    setCorrectPosition(index);
    setPendingBoard(newBoard);
    setPendingPlaceIndex(index);
    triggerPlacement();

    // 정답 배치 시 해당 인물의 명언(quote) 표시
    const quote = dialogueDataMap[currentCard.id]?.quote;
    if (quote) {
      setSubtitle({
        key: ++subtitleKeyRef.current,
        tone: getTone(currentCard.id),
        text: quote,
        nickname: currentCard.nickname,
        avatarUrl: currentCard.avatar_url,
      });
    }

    setStreak((prev) => {
      const next = prev + 1;
      if (next > highScore) {
        setHighScore(next);
        localStorage.setItem("dawn-highscore", next.toString());
      }
      // 마일스톤 연출 (5단위)
      if (next > 0 && next % 5 === 0) {
        setMilestoneText(locale === "en" ? `${next} Streak!` : `${next}명 돌파!`);
        setTimeout(() => setMilestoneText(null), 2000);
      }
      return next;
    });
  };

  const placeWrong = (wrongIndex: number) => {
    if (!currentCard) return;

    const newLives = lives - 1;
    setLives(newLives);
    setLostLifeAnim(true);
    setTimeout(() => setLostLifeAnim(false), 1500);

    // X 표시 + 해당 슬롯 비활성화 → 유저가 다시 시도
    setEliminatedSlots((prev) => [...prev, wrongIndex]);

    // 오답 → defaultLines.dawn_wrong
    showDefaultLine(getTone(currentCard.id), "dawn_wrong", {
      nickname: currentCard.nickname,
      avatarUrl: currentCard.avatar_url,
    });

    if (newLives <= 0) {
      setTimeout(() => {
        setWrongPosition(null);
        setIsRevealing(false);
        setGameState("gameover");
      }, 800);
    } else {
      // 체력 남음 → 다시 시도 가능하게 잠금 해제
      setTimeout(() => {
        setWrongPosition(null);
        setIsRevealing(false);
      }, 600);
    }
  };
  // endregion

  // region: 배치 선택
  const handlePlace = (index: number) => {
    if (!currentCard || gameState !== "playing" || isRevealing) return;

    const foundCorrectIndex = board.findIndex((c) => c.birthYear > currentCard.birthYear);
    const actualCorrectIndex = foundCorrectIndex === -1 ? board.length : foundCorrectIndex;

    const isCorrect = index === actualCorrectIndex;
    setIsRevealing(true);

    if (isCorrect) {
      clearHintState();
      placeCorrect(index);
    } else {
      // 힌트 상태는 유지하되 틀린 슬롯만 추가
      setActiveHint(null);
      setCenturyText(null);
      setHighlightedIndices([]);
      setWrongPosition(index);
      placeWrong(index);
    }
  };
  // endregion

  // region: 힌트 사용
  const hintMeta = useMemo<Record<Exclude<HintType, null>, { label: string; icon: string; desc: string }>>(
    () => ({
      century: {
        label: tDawnGame("hints.century.label"),
        icon: "📜",
        desc: tDawnGame("hints.century.desc"),
      },
      highlight: {
        label: tDawnGame("hints.highlight.label"),
        icon: "✨",
        desc: tDawnGame("hints.highlight.desc"),
      },
      eliminate: {
        label: tDawnGame("hints.eliminate.label"),
        icon: "🚫",
        desc: tDawnGame("hints.eliminate.desc"),
      },
    }),
    [tDawnGame]
  );

  const useHint = useCallback(() => {
    if (!currentCard || torches <= 0 || isRevealing || gameState !== "playing" || hintAnnounce) return;

    const foundCorrectIndex = board.findIndex((c) => c.birthYear > currentCard.birthYear);
    const actualCorrectIndex = foundCorrectIndex === -1 ? board.length : foundCorrectIndex;
    const slotCount = board.length + 1;

    // 사용 가능한 힌트 종류 결정 (이미 사용된 힌트 제외)
    const available: HintType[] = [];
    if (!centuryText) available.push("century");
    if (board.length >= 2) available.push("highlight");
    if (slotCount >= 4) available.push("eliminate");
    if (available.length === 0) return;

    const chosen = available[Math.floor(Math.random() * available.length)]!;
    setTorches((t) => t - 1);

    // 1단계: 안내 오버레이 표시
    setHintAnnounce({ type: chosen, ...hintMeta[chosen] });

    // 2단계: 1.2초 후 안내 닫고 힌트 적용 + 스크롤
    setTimeout(() => {
      setHintAnnounce(null);
      setActiveHint(chosen);

      if (chosen === "century") {
        setCenturyText(getCentury(currentCard.birthYear, locale));
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
  }, [currentCard, torches, isRevealing, gameState, board, hintAnnounce, centuryText, hintMeta, locale]);
  // endregion

  // 슬롯 확장 시 좌측에 추가되는 너비만큼 scrollLeft를 보정하여 카드가 제자리에 머무르도록 함
  const compensateScrollForExpansion = useCallback((placeIndex: number) => {
    const el = boardRef.current;
    if (!el) return;
    // 확장 전 카드 위치 기록
    const cardEl = el.querySelectorAll("[data-board-card]")[placeIndex] as HTMLElement | null;
    if (!cardEl) return;
    const offsetBefore = cardEl.offsetLeft;
    // DOM이 갱신된 뒤(좌측 슬롯 확장 시작) 차이를 scrollLeft에 반영
    requestAnimationFrame(() => {
      const offsetAfter = cardEl.offsetLeft;
      const delta = offsetAfter - offsetBefore;
      if (delta) el.scrollLeft += delta;
    });
  }, []);

  // region: 정답 처리 - 자동으로 다음 라운드 진행 (3단계 순차)
  const proceedToNextRound = useCallback(() => {
    if (!pendingBoard || pendingPlaceIndex === null) return;

    // Phase 1: 보드 갱신 + 카드 fade-in
    // expanding slot 즉시 해제 + 양쪽 빈칸 collapsed (transition:none → 0-size)
    setBoard(pendingBoard);
    setCorrectPosition(null);
    setNewlyPlacedIndex(pendingPlaceIndex);
    setExpandingSlotIndex(null);
    setExpandingSize(null);
    setCollapsedSlots([pendingPlaceIndex, pendingPlaceIndex + 1]);

    // Phase 2: 양쪽 빈칸 동시 성장 + scrollLeft 보정
    setTimeout(() => {
      compensateScrollForExpansion(pendingPlaceIndex);
      setCollapsedSlots([]);
    }, 50);

    // 퀴즈 카드 즉시 표시 (플레이스홀더 → 유저 클릭으로 공개)
    setQuizCardHidden(false);

    if (remainingCelebs.length === 0) {
      // 클리어 → 마지막 배치 인물의 battle_win 대사
      if (currentCard) {
        showDialogue(currentCard.id, getTone(currentCard.id), "battle_win", {
          nickname: currentCard.nickname,
          avatarUrl: currentCard.avatar_url,
        });
      }
      setGameState("gameover");
    } else {
      const [next, ...rest] = remainingCelebs;
      setCurrentCard(next);
      setRemainingCelebs(rest);
      setNextCardKey((k) => k + 1);
      setNextCardRevealed(false); // 플레이스홀더로 시작
    }
    setIsRevealing(false);
    setPendingBoard(null);
    setPendingPlaceIndex(null);

    setTimeout(() => setNewlyPlacedIndex(null), 500);
  }, [pendingBoard, pendingPlaceIndex, remainingCelebs, compensateScrollForExpansion, currentCard, showDialogue, getTone]);

  useEffect(() => {
    if (isRevealing && wrongPosition === null && pendingBoard) {
      // 플레이스홀더가 대사 충돌을 방지하므로 즉시 전환
      proceedToNextRound();
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
           <div className="animate-pulse text-text-secondary font-serif">{tDawnGame("loading")}</div>
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
      "w-full md:max-w-6xl mx-auto flex flex-col h-full overflow-hidden transition-colors duration-300 relative",
      showCorrectEffect && "bg-green-900/20"
    )}>
      {/* 마일스톤 연출 */}
      {milestoneText && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-in fade-in zoom-in-50 duration-300 text-center">
            <p className="text-4xl md:text-6xl font-black font-serif text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-amber-600 drop-shadow-[0_0_30px_rgba(212,175,55,0.6)] tracking-tight">
              {milestoneText}
            </p>
          </div>
        </div>
      )}
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

      {/* 데스크탑 전용: 우측 플로팅 점수+남은 */}
      <div className="hidden md:flex absolute right-6 top-18 z-30 flex-col items-center gap-2 bg-black/50 backdrop-blur-sm rounded-xl px-2.5 py-2.5 border border-white/10">
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-text-tertiary font-cinzel tracking-wider uppercase">{tDawnGame("score")}</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-base font-serif font-black text-white leading-none">{streak}</span>
            <span className="text-[10px] text-text-secondary">/</span>
            <span className="text-base font-serif font-black text-accent leading-none">{highScore}</span>
          </div>
        </div>
        <div className="w-6 h-px bg-white/10" />
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-text-tertiary font-cinzel tracking-wider uppercase">{tDawnGame("remaining")}</span>
          <span className="text-base font-serif font-black text-white leading-none">{remainingCelebs.length}</span>
        </div>
      </div>

      {/* 메인 영역: 세로 스택 (퀴즈카드 상단 + 보드 하단) */}
      <div className="flex flex-col items-center justify-center w-full flex-1 min-h-0 h-0 md:h-auto gap-0 pt-12 pb-2 md:pt-0 md:pb-0 px-0">

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
            <span className="text-[9px] text-text-tertiary">{tDawnGame("remaining")}</span>
            <span className="text-sm font-serif font-black text-white leading-none">{remainingCelebs.length}</span>
          </div>
        </div>

        {/* ── 퀴즈 카드 + 힌트/시간의눈 ── */}
        {/* PC: [횃불] [카드] [시간의눈] 가로 배치 / MB: 카드 아래에 횃불+시간의눈 */}
        {currentCard && (
          <div className="z-20 mb-3 md:mb-6 flex flex-row items-center justify-center gap-2 md:gap-4 px-2">

            {/* 좌측: 횃불 (힌트) */}
            <button
              onClick={useHint}
              disabled={torches <= 0 || isRevealing || gameState !== "playing" || !!hintAnnounce}
              className={cn(
                "flex flex-col items-center gap-0.5 md:gap-1 px-2 py-2 md:px-2.5 md:py-3 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 transition-all",
                torches > 0 && !isRevealing && !hintAnnounce
                  ? "text-orange-400 hover:bg-orange-500/20 cursor-pointer active:scale-95"
                  : "text-white/20 cursor-not-allowed"
              )}
            >
              <Flame size={16} className={cn("md:hidden", torches > 0 && "drop-shadow-[0_0_4px_rgba(251,146,60,0.5)]")} />
              <Flame size={20} className={cn("hidden md:block", torches > 0 && "drop-shadow-[0_0_4px_rgba(251,146,60,0.5)]")} />
              <span className="text-[9px] md:text-[10px] font-bold">{torches}</span>
            </button>

            {/* 퀴즈 카드 */}
            <div ref={quizCardRef} key={nextCardKey} className={cn(
              "animate-in fade-in slide-in-from-top-4 duration-500 transition-opacity",
              quizCardHidden && "opacity-0 pointer-events-none"
            )}>
              {!nextCardRevealed ? (
                /* 플레이스홀더: DawnBoardCard와 동일 규격 */
                <button
                  onClick={() => {
                    setNextCardRevealed(true);
                    showDialogue(currentCard.id, getTone(currentCard.id), "greeting", {
                      nickname: currentCard.nickname,
                      avatarUrl: currentCard.avatar_url,
                    });
                  }}
                  className="w-32 md:w-44 flex flex-col overflow-hidden rounded-xl border-2 border-white/20 shadow-lg shadow-black/40 cursor-pointer hover:border-accent/50 active:scale-95 transition-all"
                >
                  {/* 이미지 영역 — DawnBoardCard와 동일 aspect */}
                  <div className="relative aspect-square md:aspect-[3/4] w-full overflow-hidden bg-stone-900">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl md:text-5xl font-serif font-black text-white/20">?</span>
                    </div>
                  </div>
                  {/* 텍스트 영역 — DawnBoardCard와 동일 구조·패딩 */}
                  <div className="bg-white/[0.05] px-1.5 py-1 md:px-2 md:py-1.5 flex flex-col items-center text-center">
                    <span className="text-[8px] md:text-[10px] text-white/0 font-bold tracking-wider">&nbsp;</span>
                    <span className="text-[11px] md:text-base font-serif font-bold text-white/30 leading-tight">{tDawnGame("tapToReveal")}</span>
                    <span className="font-cinzel font-bold text-xs md:text-lg text-white/0 leading-none mt-0.5">&nbsp;</span>
                  </div>
                </button>
              ) : (
                <DawnBoardCard
                  imageUrl={currentCard.avatar_url}
                  name={currentCard.nickname}
                  year={
                    ((isRevealing && wrongPosition === null) || isGameOver)
                      ? formatYear(currentCard.birthYear)
                      : centuryText || tDawnGame("unknownYear")
                  }
                  profession={currentCard.profession}
                  className="w-32 md:w-44"
                  onCardClick={() => {
                    showDialogue(currentCard.id, getTone(currentCard.id), "greeting", {
                      nickname: currentCard.nickname,
                      avatarUrl: currentCard.avatar_url,
                    });
                  }}
                  onInfoClick={() => setSelectedCeleb(currentCard)}
                />
              )}
            </div>

            {/* 우측: 시간의 눈 */}
            <button
              onClick={() => { if (!isRevealing && !isGameOver) setEyeOfTimeOpen(true); }}
              disabled={isRevealing || isGameOver}
              className={cn(
                "flex flex-col items-center gap-0.5 md:gap-1 px-2 py-2 md:px-2.5 md:py-3 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 transition-all",
                !isRevealing && !isGameOver
                  ? "text-purple-400 hover:bg-purple-500/20 cursor-pointer active:scale-95"
                  : "text-white/20 cursor-not-allowed"
              )}
            >
              <Eye size={16} className={cn("md:hidden", !isRevealing && !isGameOver && "drop-shadow-[0_0_4px_rgba(168,85,247,0.5)]")} />
              <Eye size={20} className={cn("hidden md:block", !isRevealing && !isGameOver && "drop-shadow-[0_0_4px_rgba(168,85,247,0.5)]")} />
              <span className="text-[9px] md:text-[10px] font-bold font-serif">{tDawnGame("eyeShort")}</span>
            </button>
          </div>
        )}

        {/* ── 보드: 가로 스크롤 ── */}
        <div className="w-full z-20 overflow-hidden bg-black/70 border border-white/10 backdrop-blur-md rounded-xl md:rounded-2xl flex flex-col">

          {/* 장식용 레일 */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

          {/* 좌우 이동 버튼 + 시대 라벨 */}
          <div className="flex absolute left-1 md:left-2 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-0.5 md:gap-1">
            <span className="text-[7px] md:text-[9px] text-accent/50 font-cinzel tracking-wider">{tDawnGame("ancient")}</span>
            <button
              onClick={() => scrollBoard("left")}
              className="w-7 h-7 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-black/50 border border-white/20 hover:bg-white/10 hover:border-accent text-white transition-all"
            >
              <ChevronLeft size={16} className="md:hidden" />
              <ChevronLeft size={20} className="hidden md:block" />
            </button>
          </div>
          <div className="flex absolute right-1 md:right-2 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-0.5 md:gap-1">
            <span className="text-[7px] md:text-[9px] text-accent/50 font-cinzel tracking-wider">{tDawnGame("modern")}</span>
            <button
              onClick={() => scrollBoard("right")}
              className="w-7 h-7 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-black/50 border border-white/20 hover:bg-white/10 hover:border-accent text-white transition-all"
            >
              <ChevronRight size={16} className="md:hidden" />
              <ChevronRight size={20} className="hidden md:block" />
            </button>
          </div>

          {/* 시대 방향 라벨 — 좌우 버튼에 통합, 별도 없음 */}

          {/* 스크롤 영역 — 모바일: 세로 / 데스크탑: 가로 */}
          <div
            ref={boardRef}
            onMouseDown={handleBoardMouseDown}
            className="overflow-y-hidden overflow-x-auto px-8 py-4 md:py-8 text-center scrollbar-hidden touch-pan-x cursor-grab flex-none h-auto"
          >
            <div className="inline-flex flex-row items-center gap-0">
              {/* Start Slot */}
              <PlacementSlot
                slotIndex={0}
                position="start"
                onClick={() => handlePlace(0)}
                disabled={isRevealing || isGameOver}
                isActive={correctPosition === 0 && !showWrongEffect}
                isCorrectReveal={showWrongEffect && correctPosition === 0}
                isEliminated={eliminatedSlots.includes(0)}
                isExpanding={expandingSlotIndex === 0}
                isCollapsed={collapsedSlots.includes(0)}
                expandingSize={expandingSize}
              />

              {/* StartSlot → 카드 연결선 (가로) */}
              <div
                className={cn(
                  "h-px bg-white/20 shrink-0 transition-[width,height,opacity] duration-300 ease-out",
                  collapsedSlots.includes(0) ? "w-0 opacity-0" : "w-2 md:w-3"
                )}
                style={collapsedSlots.includes(0) ? { transition: "none" } : undefined}
              />

              {/* 배치된 카드들 */}
              {board.map((celeb, index) => {
                const isLeftSlotCollapsed = collapsedSlots.includes(index);
                const isRightSlotCollapsed = collapsedSlots.includes(index + 1);
                return (
                  <div
                    key={celeb.id}
                    className={cn(
                      "flex flex-row items-center gap-0 snap-center w-auto",
                      index === newlyPlacedIndex && "animate-in fade-in duration-300"
                    )}
                  >
                    {/* 좌측 연결선 */}
                    <div
                      className={cn(
                        "h-px bg-white/20 shrink-0 transition-[width,height,opacity] duration-300 ease-out",
                        isLeftSlotCollapsed ? "w-0 opacity-0" : "w-2 md:w-3"
                      )}
                      style={isLeftSlotCollapsed ? { transition: "none" } : undefined}
                    />

                    {/* 카드 본체 */}
                    <DawnBoardCard
                      imageUrl={celeb.avatar_url}
                      name={celeb.nickname}
                      year={formatYear(celeb.birthYear)}
                      profession={celeb.profession}
                      isHighlighted={highlightedIndices.includes(index)}
                      isNewlyPlaced={index === newlyPlacedIndex}
                      className="w-28 md:w-40 shrink-0"
                      onCardClick={() => {
                        showDefaultLine(getTone(celeb.id), "dawn_guide", {
                          nickname: celeb.nickname,
                          avatarUrl: celeb.avatar_url,
                        });
                      }}
                      onInfoClick={() => setSelectedCeleb(celeb)}
                    />

                    {/* 카드→슬롯 연결선 */}
                    <div
                      className={cn(
                        "h-px bg-white/20 shrink-0 transition-[width,height,opacity] duration-300 ease-out",
                        isRightSlotCollapsed ? "w-0 opacity-0" : "w-2 md:w-3"
                      )}
                      style={isRightSlotCollapsed ? { transition: "none" } : undefined}
                    />

                    {/* 사이 슬롯 */}
                    <PlacementSlot
                      slotIndex={index + 1}
                      position={index === board.length - 1 ? "end" : "middle"}
                      onClick={() => handlePlace(index + 1)}
                      disabled={isRevealing || isGameOver}
                      isActive={correctPosition === index + 1 && !showWrongEffect}
                      isCorrectReveal={showWrongEffect && correctPosition === index + 1}
                      isEliminated={eliminatedSlots.includes(index + 1)}
                      isExpanding={expandingSlotIndex === index + 1}
                      isCollapsed={isRightSlotCollapsed}
                      expandingSize={expandingSize}
                    />

                    {/* 슬롯→다음카드 연결선 (마지막 제외) */}
                    {index < board.length - 1 && (
                      <div
                        className={cn(
                          "h-px bg-white/20 shrink-0 transition-[width,height,opacity] duration-300 ease-out",
                          isRightSlotCollapsed ? "w-0 opacity-0" : "w-2 md:w-3"
                        )}
                        style={isRightSlotCollapsed ? { transition: "none" } : undefined}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 시대 방향 라벨 — 좌우 버튼에 통합 */}
        </div>
      </div>{/* 메인 영역 끝 */}

    {/* 메인 영역 끝 */}

      {/* 힌트 안내 오버레이 */}
      {hintAnnounce && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative flex flex-col items-center gap-3 animate-in zoom-in-75 fade-in duration-300">
            <span className="text-5xl md:text-6xl">{hintAnnounce.icon}</span>
            <span className="text-xl md:text-2xl font-serif font-black text-orange-300 drop-shadow-[0_0_20px_rgba(251,146,60,0.5)]">
              {hintAnnounce.label}
            </span>
            <span className="text-xs md:text-sm text-orange-200/70 font-medium">
              {hintAnnounce.desc}
            </span>
            <Flame size={20} className="text-orange-400/60 animate-pulse" />
          </div>
        </div>
      )}

      {/* 오답 시 중앙 라이프 감소 연출 — 하트만 표시 (빨간 비네트 없음) */}

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
          onReplay={() => startGame(difficulty)}
          onLobby={() => setGameState("idle")}
        />
      )}

      {/* 셀럽 상세 모달 */}
      {selectedCeleb && (
        <CelebDetailModal
          celeb={selectedCeleb}
          isOpen={!!selectedCeleb}
          onClose={() => setSelectedCeleb(null)}
          hideBirthDate
          zIndex={Z_INDEX.gameModal}
        />
      )}
    </div>
  );
}
