import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export default function ArrowNavigator({
  items,
  activeIndex,
  onChange,
  prefix,
  compact,
  className,
}: {
  items: string[];
  activeIndex: number;
  onChange: (index: number) => void;
  prefix?: string;
  /** compact=true → 레슨용 소형, false → 스텝용 강조 */
  compact?: boolean;
  className?: string;
}) {
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === items.length - 1;

  const btnSize = compact ? "h-6 w-6" : "h-8 w-8";
  const iconSize = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const btnBase = `flex ${btnSize} items-center justify-center rounded-full transition-colors`;
  const btnEnabled = "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white";

  return (
    <div className={`flex items-center justify-center gap-2 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => onChange(isFirst ? items.length - 1 : activeIndex - 1)}
        className={`${btnBase} ${btnEnabled}`}
        aria-label={isFirst ? "Last" : "Previous"}
      >
        {isFirst ? <ChevronsLeft className={iconSize} /> : <ChevronLeft className={iconSize} />}
      </button>

      <div className={`flex flex-col items-center ${compact ? "min-w-[140px] gap-0.5" : "min-w-[200px] gap-1"}`}>
        {prefix && (
          <span className={`font-semibold uppercase tracking-[0.16em] ${compact ? "text-[10px] text-white/30" : "text-[11px] text-white/45"}`}>
            {prefix} {activeIndex + 1}/{items.length}
          </span>
        )}
        <span className={`text-center leading-tight ${compact ? "text-xs font-semibold text-[#d4af37]/60" : "text-sm font-bold tracking-[0.05em] text-[#d4af37]/90 sm:text-base"}`}>
          {items[activeIndex]}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onChange(isLast ? 0 : activeIndex + 1)}
        className={`${btnBase} ${btnEnabled}`}
        aria-label={isLast ? "First" : "Next"}
      >
        {isLast ? <ChevronsRight className={iconSize} /> : <ChevronRight className={iconSize} />}
      </button>
    </div>
  );
}
