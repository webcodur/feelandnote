"use client";

import { useLocale, useTranslations } from "next-intl";
import { BookOpenText, MapPinned, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Ghost, SkeletonFrame } from "../hub/ExploreSkeleton";
import { MYTH_LAYOUT as layout } from "./mythLayout";

// Approximate chip widths; the list wraps exactly as the live navigation does.
const CHIP_WIDTHS = {
  ko: { regions: [58, 58, 58, 58, 103, 70, 108, 70, 70], traditions: [105, 118, 92, 174, 79, 92, 105, 92] },
  en: { regions: [67, 69, 67, 61, 118, 67, 129, 72, 138], traditions: [126, 162, 104, 229, 85, 115, 141, 147] },
} as const;

function NavChips({ widths }: { widths: readonly number[] }) {
  return (
    <div className={layout.navList}>
      {widths.map((width, index) => (
        <div key={index} style={{ width }} className="flex h-[34px] shrink-0 items-center justify-center rounded-full border border-white/[0.08] px-3.5">
          <Ghost className="h-2.5 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function MythAtlasSkeleton() {
  const t = useTranslations("explore.hub.myth");
  const common = useTranslations("common");
  const chips = CHIP_WIDTHS[useLocale() === "en" ? "en" : "ko"];

  return (
    <SkeletonFrame label={`${t("title")} · ${common("loading")}`} className={layout.atlas}>
      <div aria-hidden="true">
        <div className={layout.navigationOuter}>
          <div className={layout.navigation}>
            <div className={layout.nav}>
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-text-primary">
                <MapPinned size={16} className="text-accent" />
                <span>{t("regionSelection")}</span>
              </div>
              <NavChips widths={chips.regions} />
            </div>
            <div className={layout.nav}>
              <p className="text-center text-sm font-bold text-text-primary">{t("mythSelection")}</p>
              <NavChips widths={chips.traditions} />
            </div>
            <div className={cn(layout.notice, "relative")}>
              <div className="mt-0.5 size-3.5 shrink-0" />
              <p className="invisible">{t("releaseNotice")}</p>
              <div className="absolute inset-0 flex items-center justify-center px-6"><Ghost className="h-2.5 w-full max-w-md" /></div>
            </div>
          </div>
        </div>

        <div className={layout.railOuter}>
          <div className={layout.container}>
            <div className={layout.rail}>
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <p className="flex items-center gap-2 text-sm font-bold text-text-primary"><Sparkles size={16} className="text-accent" />{t("memberList")}</p>
                <div className="flex gap-1"><Ghost className="size-8 rounded-full" /><Ghost className="size-8 rounded-full" /></div>
              </div>
              <div className="scrollbar-thin -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 md:gap-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className={cn("flex shrink-0 flex-col", layout.railCardSize)}>
                    <Ghost className="aspect-square w-full rounded-[14px]" />
                    <div className="mt-2 space-y-1.5 px-0.5 pb-1"><Ghost className="h-2.5 w-full" /><Ghost className="h-2.5 w-2/3" /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={layout.overviewOuter}>
          <div className={layout.container}>
            <div className={layout.overview}>
              <div className="relative bg-black">
                <div className={cn(layout.artwork, "bg-white/[0.03]")}>
                  <Ghost className="absolute bottom-5 start-5 h-9 w-2/5 md:bottom-7 md:start-7 md:h-12 lg:bottom-8 lg:start-8" />
                </div>
                <div className={layout.overviewPanel}>
                  <div className={layout.overviewBody}>
                    <div className={layout.overviewHeader}>
                      <p className="flex shrink-0 items-center gap-2 text-xs font-bold tracking-[.16em] text-accent md:text-sm"><BookOpenText size={17} />{t("mythOverview")}</p>
                      <div className={cn(layout.overviewStats, "relative")}>
                        <span className="invisible">{t("mythOverviewStats", { people: "00", works: "00" })}</span>
                        <Ghost className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2" />
                      </div>
                    </div>
                    <div className={cn(layout.description, "overflow-hidden")}>
                      <div className="space-y-4 pt-1.5 md:space-y-5">
                        {Array.from({ length: 8 }, (_, index) => <Ghost key={index} className={cn("h-3", index % 4 === 3 && "w-3/4")} />)}
                      </div>
                    </div>
                    <div className="mt-4 flex shrink-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-bg-card p-2.5">
                      <Ghost className="h-[68px] w-[52px] shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <p className={cn(layout.entryLabel, "text-text-secondary")}>{t("entryWork")}</p>
                        <div className={cn(layout.entryTitle, "flex flex-col justify-center gap-2")}><Ghost className="h-2.5 w-full" /><Ghost className="h-2.5 w-3/4" /></div>
                        <div className={cn(layout.entryCreator, "flex items-center")}><Ghost className="h-2 w-1/2" /></div>
                      </div>
                      <Ghost className="size-8 shrink-0 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SkeletonFrame>
  );
}
