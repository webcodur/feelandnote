/*
  파일명: DawnGame/sections/GameBoard.tsx
  기능: 보드 가로 스크롤 영역 — 배치된 카드 + 슬롯 + 좌우 이동
*/
import type { RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import DawnBoardCard from "../../dawn/DawnBoardCard";
import PlacementSlot from "./PlacementSlot";
import { formatYear } from "../useDawnGame";
import type { DawnCeleb } from "../types";

interface GameBoardProps {
  board: DawnCeleb[];
  boardRef: RefObject<HTMLDivElement | null>;
  isRevealing: boolean;
  isGameOver: boolean;
  wrongPosition: number | null;
  correctPosition: number | null;
  newlyPlacedIndex: number | null;
  expandingSlotIndex: number | null;
  expandingSize: { width: number; height: number } | null;
  collapsedSlots: number[];
  highlightedIndices: number[];
  eliminatedSlots: number[];
  tDawnGame: (key: string) => string;
  // actions
  onPlace: (index: number) => void;
  onScrollBoard: (direction: "left" | "right") => void;
  onBoardMouseDown: (e: React.MouseEvent) => void;
  onCardClick: (celeb: DawnCeleb) => void;
  onInfoClick: (celeb: DawnCeleb) => void;
}

export default function GameBoard({
  board,
  boardRef,
  isRevealing,
  isGameOver,
  wrongPosition,
  correctPosition,
  newlyPlacedIndex,
  expandingSlotIndex,
  expandingSize,
  collapsedSlots,
  highlightedIndices,
  eliminatedSlots,
  tDawnGame,
  onPlace,
  onScrollBoard,
  onBoardMouseDown,
  onCardClick,
  onInfoClick,
}: GameBoardProps) {
  const showWrongEffect = wrongPosition !== null;

  return (
    <div className="w-full z-20 overflow-hidden bg-black/70 border border-white/10 backdrop-blur-md rounded-xl md:rounded-2xl flex flex-col">

      {/* 장식용 레일 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* 좌우 이동 버튼 + 시대 라벨 */}
      <div className="flex absolute left-1 md:left-2 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-0.5 md:gap-1">
        <span className="text-[7px] md:text-[9px] text-accent/50 font-cinzel tracking-wider">{tDawnGame("ancient")}</span>
        <button
          onClick={() => onScrollBoard("left")}
          className="w-7 h-7 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-black/50 border border-white/20 hover:bg-white/10 hover:border-accent text-white transition-all"
        >
          <ChevronLeft size={16} className="md:hidden" />
          <ChevronLeft size={20} className="hidden md:block" />
        </button>
      </div>
      <div className="flex absolute right-1 md:right-2 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-0.5 md:gap-1">
        <span className="text-[7px] md:text-[9px] text-accent/50 font-cinzel tracking-wider">{tDawnGame("modern")}</span>
        <button
          onClick={() => onScrollBoard("right")}
          className="w-7 h-7 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-black/50 border border-white/20 hover:bg-white/10 hover:border-accent text-white transition-all"
        >
          <ChevronRight size={16} className="md:hidden" />
          <ChevronRight size={20} className="hidden md:block" />
        </button>
      </div>

      {/* 스크롤 영역 */}
      <div
        ref={boardRef}
        onMouseDown={onBoardMouseDown}
        className="overflow-y-hidden overflow-x-auto px-8 py-4 md:py-8 text-center scrollbar-hidden touch-pan-x cursor-grab flex-none h-auto"
      >
        <div className="inline-flex flex-row items-center gap-0">
          {/* Start Slot */}
          <PlacementSlot
            slotIndex={0}
            position="start"
            onClick={() => onPlace(0)}
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
                  onCardClick={() => onCardClick(celeb)}
                  onInfoClick={() => onInfoClick(celeb)}
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
                  onClick={() => onPlace(index + 1)}
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
  );
}
