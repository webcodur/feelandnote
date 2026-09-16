"use client";

import { useLocale, useTranslations } from "next-intl";
import { BookOpenText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Ghost, SkeletonFrame } from "../hub/ExploreSkeleton";
import { ATLAS_NAV_LAYOUT } from "@/components/shared/atlasNavLayout";
import { MYTH_LAYOUT as layout } from "./mythLayout";

// Approximate chip widths; each list stays on one line like the live rails.
const CHIP_WIDTHS = {
  ko: { regions: [50, 50, 50, 50, 95, 62, 100, 62, 62], traditions: [97, 110, 84, 166, 71, 84, 97, 84] },
  en: { regions: [59, 61, 59, 53, 110, 59, 121, 64, 130], traditions: [118, 154, 96, 221, 77, 107, 133, 139] },
} as const;

function NavChips({ widths, shape }: { widths: readonly number[]; shape: string }) {
  return (
    <div className={layout.navList}>
      {widths.map((width, index) => (
        <div key={index} style={{ width }} className={cn(ATLAS_NAV_LAYOUT.chip, "border-white/[0.08]", shape)}>
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
          <div className={cn(layout.navigation, ATLAS_NAV_LAYOUT.navigationBareMobile)}>
            <div className={layout.mobilePicker}>
              <div className="flex h-[38px] items-center rounded-lg border border-white/[0.08] px-3.5"><Ghost className="h-2.5 w-full" /></div>
              <div className="flex h-[38px] items-center rounded-lg border border-white/[0.08] px-3.5"><Ghost className="h-2.5 w-full" /></div>
              <div className="col-span-2 flex h-[38px] items-center rounded-lg border border-white/[0.08] px-3.5"><Ghost className="h-2.5 w-1/2" /></div>
            </div>
            <div className={layout.chipNav}><NavChips widths={chips.regions} shape={layout.regionChipShape} /></div>
            <div className={layout.chipNav}><NavChips widths={chips.traditions} shape={layout.traditionChipShape} /></div>
            <div className={layout.chipNav}>
              <div className={layout.navList}>
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className={cn(layout.groupTab, "w-[96px] border-transparent")}><Ghost className="h-2.5 w-full" /></div>
                ))}
              </div>
            </div>
            <div className={layout.nav}>
              <div className={layout.memberList}>
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className={cn("flex shrink-0 flex-col", layout.railCardSize)}>
                    <Ghost className="aspect-square w-full rounded-[14px]" />
                    <div className="mt-2 flex h-5 items-center px-0.5"><Ghost className="h-2.5 w-full" /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={layout.overviewOuter}>
          <div className={layout.container}>
            <div className={layout.overview}>
              <div className="relative">
                <div className={cn(layout.artwork, "bg-white/[0.03]")}>
                  <Ghost className="absolute end-3 top-1/2 size-11 -translate-y-1/2 rounded-full md:size-12 lg:end-[calc(43%+2rem)]" />
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
                  </div>
                </div>
              </div>
            </div>

            {/* 작품 선반 — 개요 아래에 붙는 밴드. 표지 열만 잡아 둔다 */}
            <div className="mt-4 overflow-hidden rounded-[24px] bg-black/[0.14] px-5 py-6 md:px-8 md:py-8">
              <div className="mb-5 flex items-center justify-between gap-4">
                <Ghost className="h-4 w-28" />
                <Ghost className="h-3 w-16" />
              </div>
              <div className="flex gap-3 overflow-hidden md:gap-4">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="w-36 shrink-0 md:w-44">
                    <Ghost className="aspect-[3/4] w-full rounded-t-2xl" />
                    <div className="flex flex-col items-center gap-2 p-3">
                      <Ghost className="h-2.5 w-full" />
                      <Ghost className="h-2 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SkeletonFrame>
  );
}
