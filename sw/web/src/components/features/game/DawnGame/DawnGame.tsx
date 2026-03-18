/*
  파일명: DawnGame/DawnGame.tsx
  기능: 여명(Dawn) 게임 메인 컴포넌트
  책임: 셀럽 생년을 시간순으로 배치하는 게임
  업데이트: Neo-Pantheon 디자인 적용 (DawnQuizCard + DawnBoardCard)
*/
"use client";

import type { MutableRefObject } from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/constants/zIndex";
import EyeOfTime from "../dawn/EyeOfTime";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";
import DawnResult from "../dawn/DawnResult";
import { useDawnGame } from "./useDawnGame";
import { INITIAL_TORCHES } from "./types";
import { DesktopLives, DesktopScore, MobileHeader } from "./sections/GameHud";
import QuizArea from "./sections/QuizArea";
import GameBoard from "./sections/GameBoard";

interface DawnGameProps {
  onEnterFullScreen?: () => void;
  onHomeRef?: MutableRefObject<(() => void) | null>;
  onPhaseChange?: (phase: string) => void;
  onStartRef?: MutableRefObject<((difficulty: "easy" | "hard") => void) | null>;
}

export default function DawnGame({ onEnterFullScreen, onHomeRef, onPhaseChange, onStartRef }: DawnGameProps = {}) {
  const g = useDawnGame({ onPhaseChange, onHomeRef, onStartRef });

  // region: 렌더링
  if (!g.isDataLoaded) {
     return (
        <div className="flex items-center justify-center min-h-[500px]">
           <div className="animate-pulse text-text-secondary font-serif">{g.tDawnGame("loading")}</div>
        </div>
     );
  }

  // idle — 래퍼가 로비를 렌더링하므로 null 반환
  if (g.gameState === "idle") {
    return null;
  }

  const showCorrectEffect = g.isRevealing && g.wrongPosition === null;

  return (
    <div className={cn(
      "w-full md:max-w-6xl mx-auto flex flex-col h-full overflow-hidden transition-colors duration-300 relative",
      showCorrectEffect && "bg-green-900/20"
    )}>
      {/* 마일스톤 연출 */}
      {g.milestoneText && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-in fade-in zoom-in-50 duration-300 text-center">
            <p className="text-4xl md:text-6xl font-black font-serif text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-amber-600 drop-shadow-[0_0_30px_rgba(212,175,55,0.6)] tracking-tight">
              {g.milestoneText}
            </p>
          </div>
        </div>
      )}

      {/* ===== 데스크탑 전용 HUD ===== */}
      <DesktopLives lives={g.lives} lostLifeAnim={g.lostLifeAnim} />
      <DesktopScore streak={g.streak} highScore={g.highScore} remainingCount={g.remainingCelebs.length} tDawnGame={g.tDawnGame} />

      {/* 메인 영역: 세로 스택 (퀴즈카드 상단 + 보드 하단) */}
      <div className="flex flex-col items-center justify-center w-full flex-1 min-h-0 h-0 md:h-auto gap-0 pt-12 pb-2 md:pt-0 md:pb-0 px-0">

        {/* ── 모바일 통합 상단 헤더 바 ── */}
        <MobileHeader
          lives={g.lives}
          streak={g.streak}
          highScore={g.highScore}
          remainingCount={g.remainingCelebs.length}
          lostLifeAnim={g.lostLifeAnim}
          tDawnGame={g.tDawnGame}
        />

        {/* ── 퀴즈 카드 + 힌트/시간의눈 ── */}
        {g.currentCard && (
          <QuizArea
            currentCard={g.currentCard}
            nextCardKey={g.nextCardKey}
            quizCardHidden={g.quizCardHidden}
            nextCardRevealed={g.nextCardRevealed}
            isRevealing={g.isRevealing}
            wrongPosition={g.wrongPosition}
            isGameOver={g.isGameOver}
            centuryText={g.centuryText}
            torches={g.torches}
            hintAnnounce={g.hintAnnounce}
            quizCardRef={g.quizCardRef}
            tDawnGame={g.tDawnGame}
            onRevealCard={() => {
              g.setNextCardRevealed(true);
              g.showDialogue(g.currentCard!.id, g.getTone(g.currentCard!.id), "greeting", {
                nickname: g.currentCard!.nickname,
                avatarUrl: g.currentCard!.avatar_url,
              });
            }}
            onUseHint={g.useHint}
            onOpenEyeOfTime={() => { if (!g.isRevealing && !g.isGameOver) g.setEyeOfTimeOpen(true); }}
            onCardClick={() => {
              g.showDialogue(g.currentCard!.id, g.getTone(g.currentCard!.id), "greeting", {
                nickname: g.currentCard!.nickname,
                avatarUrl: g.currentCard!.avatar_url,
              });
            }}
            onInfoClick={() => g.setSelectedCeleb(g.currentCard)}
          />
        )}

        {/* ── 보드: 가로 스크롤 ── */}
        <GameBoard
          board={g.board}
          boardRef={g.boardRef}
          isRevealing={g.isRevealing}
          isGameOver={g.isGameOver}
          wrongPosition={g.wrongPosition}
          correctPosition={g.correctPosition}
          newlyPlacedIndex={g.newlyPlacedIndex}
          expandingSlotIndex={g.expandingSlotIndex}
          expandingSize={g.expandingSize}
          collapsedSlots={g.collapsedSlots}
          highlightedIndices={g.highlightedIndices}
          eliminatedSlots={g.eliminatedSlots}
          tDawnGame={g.tDawnGame}
          onPlace={g.handlePlace}
          onScrollBoard={g.scrollBoard}
          onBoardMouseDown={g.handleBoardMouseDown}
          onCardClick={(celeb) => {
            g.showDefaultLine(g.getTone(celeb.id), "dawn_guide", {
              nickname: celeb.nickname,
              avatarUrl: celeb.avatar_url,
            });
          }}
          onInfoClick={(celeb) => g.setSelectedCeleb(celeb)}
        />
      </div>{/* 메인 영역 끝 */}

    {/* 메인 영역 끝 */}

      {/* 힌트 안내 오버레이 */}
      {g.hintAnnounce && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative flex flex-col items-center gap-3 animate-in zoom-in-75 fade-in duration-300">
            <span className="text-5xl md:text-6xl">{g.hintAnnounce.icon}</span>
            <span className="text-xl md:text-2xl font-serif font-black text-orange-300 drop-shadow-[0_0_20px_rgba(251,146,60,0.5)]">
              {g.hintAnnounce.label}
            </span>
            <span className="text-xs md:text-sm text-orange-200/70 font-medium">
              {g.hintAnnounce.desc}
            </span>
            <Flame size={20} className="text-orange-400/60 animate-pulse" />
          </div>
        </div>
      )}

      {/* 오답 시 중앙 라이프 감소 연출 — 하트만 표시 (빨간 비네트 없음) */}

      {/* 시간의 눈 오버레이 */}
      {g.eyeOfTimeOpen && g.currentCard && (
        <EyeOfTime
          boardYears={g.board.map((c) => c.birthYear)}
          correctYear={g.currentCard.birthYear}
          celebName={g.currentCard.nickname}
          onPerfect={() => {
            g.setEyeOfTimeOpen(false);
            g.setIsRevealing(true);
            g.clearHintState();
            const foundIdx = g.board.findIndex((c) => c.birthYear > g.currentCard!.birthYear);
            const correctIdx = foundIdx === -1 ? g.board.length : foundIdx;
            g.placeCorrect(correctIdx);
            g.setTorches((t) => Math.min(t + 1, INITIAL_TORCHES + 2));
          }}
          onGood={(correctIdx) => {
            g.setEyeOfTimeOpen(false);
            g.setIsRevealing(true);
            g.clearHintState();
            g.placeCorrect(correctIdx);
          }}
          onMiss={() => {
            g.setEyeOfTimeOpen(false);
            g.setIsRevealing(true);
            g.clearHintState();
            const foundIdx = g.board.findIndex((c) => c.birthYear > g.currentCard!.birthYear);
            const correctIdx = foundIdx === -1 ? g.board.length : foundIdx;
            g.placeWrong(correctIdx);
          }}
          onCancel={() => g.setEyeOfTimeOpen(false)}
        />
      )}

      {/* 게임오버 - 결과 */}
      {g.isGameOver && (
        <DawnResult
          board={g.board}
          currentCard={g.currentCard}
          streak={g.streak}
          lives={g.lives}
          isNewRecord={g.isNewRecord}
          onReplay={() => g.startGame(g.difficulty)}
          onLobby={() => g.setGameState("idle")}
        />
      )}

      {/* 셀럽 상세 모달 */}
      {g.selectedCeleb && (
        <CelebDetailModal
          celeb={g.selectedCeleb}
          isOpen={!!g.selectedCeleb}
          onClose={() => g.setSelectedCeleb(null)}
          hideBirthDate
          zIndex={Z_INDEX.gameModal}
        />
      )}
    </div>
  );
}
