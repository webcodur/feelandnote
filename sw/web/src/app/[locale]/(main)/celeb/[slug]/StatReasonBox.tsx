/* ─────────────────────────────────────────────
 * [celeb 상세] analysis — 스탯 근거 상자(공용)
 * - 목차 위치: analysis > spectrum
 * - 데이터: hint/empty/reason/active props
 * - 함께 보기: AbilityStatList.tsx, DispositionStatList.tsx, VirtueStatList.tsx
 * ───────────────────────────────────────────── */
import AnimatedHeight from "@/components/ui/AnimatedHeight";

interface Props {
  hint: string;
  empty: string;
  reason?: string;
  active: boolean;
}

export default function StatReasonBox({ hint, empty, reason, active }: Props) {
  return (
    <AnimatedHeight duration={220} className="w-full">
      <div
        className="flex min-h-16 items-center justify-center rounded-[2px] border border-white/[0.08] bg-black/20 px-3 py-2.5 transition-colors duration-150"
        aria-live="polite"
      >
        <p
          className={
            active
              ? "text-center text-sm leading-relaxed text-text-secondary break-keep"
              : "text-center text-sm text-text-secondary/70 break-keep"
          }
        >
          {active ? reason || empty : hint}
        </p>
      </div>
    </AnimatedHeight>
  );
}
