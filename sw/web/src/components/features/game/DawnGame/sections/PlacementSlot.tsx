/*
  파일명: DawnGame/sections/PlacementSlot.tsx
  기능: 보드 사이 배치 슬롯 컴포넌트
*/
import { cn } from "@/lib/utils";

// 가로 보드 사이 세로 슬롯
export default function PlacementSlot({
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
