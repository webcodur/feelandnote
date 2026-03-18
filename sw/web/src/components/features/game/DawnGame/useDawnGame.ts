/*
  파일명: DawnGame/useDawnGame.ts
  기능: 여명(Dawn) 게임 상태 관리 및 로직 훅
*/
"use client";

import { useState, useEffect, useCallback, useRef, useMemo, type MutableRefObject } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getCelebs } from "@/actions/home/getCelebs";
import { getDawnDialogues, type DawnDialogueData } from "@/actions/game/getDawnDialogues";
import { isPublicDomainCeleb, getCentury } from "../utils";
import { useDialogue, useDialogueSubtitle } from "../shared/hooks/useDialogue";
import type { SpeechTone, DialogueLines } from "@/lib/game/voice/types";
import { validateSpeechTone } from "@/lib/game/voice/speechTone";
import type { DawnCeleb, GameState, Difficulty, HintType } from "./types";
import { INITIAL_LIVES, INITIAL_TORCHES } from "./types";

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

export function formatYear(year: number): string {
  if (year < 0) return `BC ${Math.abs(year)}`;
  return `AD ${year}`;
}
// endregion

interface UseDawnGameOptions {
  onPhaseChange?: (phase: string) => void;
  onHomeRef?: MutableRefObject<(() => void) | null>;
  onStartRef?: MutableRefObject<((difficulty: "easy" | "hard") => void) | null>;
}

export function useDawnGame({ onPhaseChange, onHomeRef, onStartRef }: UseDawnGameOptions) {
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

  const voiceSpeeds = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of allCelebs) {
      if (c.voice_speed && c.voice_speed !== 1.0) map.set(c.id, c.voice_speed);
    }
    return map;
  }, [allCelebs]);

  const { showDialogue, showDefaultLine } = useDialogue({
    sfxMutedRef,
    onSubtitle: setSubtitle,
    personalDialogues,
    voiceCelebIds,
    voiceVersions,
    voiceSpeeds,
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

  const triggerPlacement = () => {
    setQuizCardHidden(true);
  };

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
        icon: "\u{1F4DC}",
        desc: tDawnGame("hints.century.desc"),
      },
      highlight: {
        label: tDawnGame("hints.highlight.label"),
        icon: "\u2728",
        desc: tDawnGame("hints.highlight.desc"),
      },
      eliminate: {
        label: tDawnGame("hints.eliminate.label"),
        icon: "\u{1F6AB}",
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

  return {
    // i18n
    locale,
    tDawnGame,
    // state
    board,
    currentCard,
    remainingCelebs,
    streak,
    highScore,
    gameState,
    difficulty,
    isRevealing,
    wrongPosition,
    correctPosition,
    isDataLoaded,
    selectedCeleb,
    setSelectedCeleb,
    newlyPlacedIndex,
    nextCardKey,
    quizCardHidden,
    expandingSlotIndex,
    expandingSize,
    collapsedSlots,
    nextCardRevealed,
    setNextCardRevealed,
    // lives & hints
    lives,
    torches,
    activeHint,
    centuryText,
    highlightedIndices,
    eliminatedSlots,
    lostLifeAnim,
    hintAnnounce,
    eyeOfTimeOpen,
    setEyeOfTimeOpen,
    milestoneText,
    // dialogue
    dialogueDataMap,
    showDialogue,
    showDefaultLine,
    getTone,
    // refs
    boardRef,
    quizCardRef,
    // derived
    isEasyMode,
    isNewRecord,
    isGameOver,
    // actions
    startGame,
    handlePlace,
    useHint,
    scrollBoard,
    handleBoardMouseDown,
    // helpers for EyeOfTime
    clearHintState: () => {
      setActiveHint(null);
      setCenturyText(null);
      setHighlightedIndices([]);
      setEliminatedSlots([]);
    },
    placeCorrect,
    placeWrong,
    setIsRevealing,
    setTorches,
    setGameState,
  };
}
