import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import PendingMark from "@/components/ui/pending/PendingMark";

// Live grids and their loading placeholders use the same breakpoints and spacing.
export const HUB_CELEB_GRID = "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4";
export const HUB_FACTION_GRID = "-mx-3 flex snap-x snap-mandatory scroll-px-3 gap-3 overflow-x-auto px-3 pb-2 scrollbar-hide overscroll-x-contain md:mx-auto md:grid md:w-full md:max-w-[1160px] md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 xl:gap-8";
export const HUB_FACTION_CARD = "relative aspect-square w-[88%] max-w-[420px] shrink-0 snap-start overflow-hidden rounded-[1.25rem] border md:w-auto md:max-w-none md:snap-none md:rounded-2xl";

export function Ghost({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("rounded bg-white/[0.06]", className)} />;
}

/** A failed request keeps its reserved space while making the retry message available. */
export function ReservedState({ skeleton, children }: { skeleton: ReactNode; children: ReactNode }) {
  return (
    <div className="grid">
      <div aria-hidden="true" className="invisible pointer-events-none [grid-area:1/1]">{skeleton}</div>
      <div className="flex min-w-0 items-center justify-center [grid-area:1/1]">{children}</div>
    </div>
  );
}

/** One quiet loading signal per region; the shapes themselves do not pulse. */
export function SkeletonFrame({ children, label, className }: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={cn("relative", className)}>
      {children}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <PendingMark />
      </div>
    </div>
  );
}

export function ProfileGridSkeleton({ label }: { label: string }) {
  return (
    <SkeletonFrame label={label}>
      <div aria-hidden="true" className={HUB_CELEB_GRID}>
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="relative aspect-square w-full overflow-hidden rounded-md border border-white/5 bg-white/[0.03]">
              <Ghost className="absolute right-2 top-2 h-4 w-7 rounded-full md:h-5 md:w-8" />
            </div>
            <div className="mt-1.5 w-full px-0.5">
              <div className="flex h-[15px] items-center justify-center md:h-[17.5px]"><Ghost className="h-2.5 w-2/3 md:h-3" /></div>
              <div className="mt-0.5 flex h-[12.5px] items-center justify-center md:h-[15px]"><Ghost className="h-2 w-1/2 md:h-2.5" /></div>
            </div>
          </div>
        ))}
      </div>
    </SkeletonFrame>
  );
}

export function FactionSkeleton({ label }: { label: string }) {
  return (
    <SkeletonFrame label={label}>
      <div aria-hidden="true" className={HUB_FACTION_GRID}>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className={cn(HUB_FACTION_CARD, "border-white/10 bg-white/[0.03]")}>
            <div className="absolute inset-x-0 top-0 flex justify-between p-4 md:p-7">
              <Ghost className="h-0.5 w-9 md:w-12" />
              <Ghost className="h-3 w-4" />
            </div>
            <div className="absolute inset-x-0 bottom-0 space-y-3 p-4 md:p-7 lg:p-8">
              <Ghost className="h-6 w-1/2 md:h-9 lg:h-10" />
              <Ghost className="h-3 w-full md:h-4" />
              <Ghost className="h-3 w-3/4 md:h-4" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonFrame>
  );
}
