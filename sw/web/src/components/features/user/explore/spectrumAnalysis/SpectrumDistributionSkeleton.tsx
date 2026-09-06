"use client";

import { useTranslations } from "next-intl";
import { Ghost, SkeletonFrame } from "../hub/ExploreSkeleton";
import { AXIS_BOTTOM, SPECTRUM_CHART_CLASS, SPECTRUM_CHART_STYLE, SPECTRUM_GUIDE_CLASS } from "./constants";
import SpectrumTabs from "./SpectrumTabs";

export function SpectrumChartSkeleton() {
  return (
    <div aria-hidden className={SPECTRUM_CHART_CLASS} style={SPECTRUM_CHART_STYLE}>
      <div className="absolute inset-x-0 h-px bg-border/50" style={{ bottom: AXIS_BOTTOM }} />
      <div className="absolute inset-x-5 flex items-end justify-center gap-2 sm:gap-3" style={{ bottom: AXIS_BOTTOM + 2 }}>
        {[20, 32, 48, 66, 82, 96, 82, 66, 48, 32, 20].map((height, index) => (
          <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="w-full rounded-t bg-white/[0.06] @min-[640px]:hidden" style={{ height: height * 1.4 }} />
            {Array.from({ length: Math.ceil(height / 11) }, (_, row) => (
              <Ghost key={row} className="hidden size-8 rounded-full @min-[640px]:block @min-[768px]:size-10" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SpectrumBucketSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-2xl border border-border/50 bg-bg-card/30">
      <div className="flex h-[43px] items-center justify-between border-b border-border/40 px-3">
        <Ghost className="size-5 rounded-full" /><Ghost className="h-4 w-36" /><Ghost className="size-5 rounded-full" />
      </div>
      <div className="h-60 space-y-0.5 overflow-hidden p-2">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 px-2 py-1.5">
            <Ghost className="size-9 shrink-0 rounded-full" />
            <Ghost className="h-4 w-24" />
            <Ghost className="ms-auto h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SpectrumDistributionSkeleton() {
  const t = useTranslations("pending");
  const tSpectrum = useTranslations("explore.ui.spectrumDistribution");

  return (
    <div className="@container">
      <SkeletonFrame label={t("loading")}>
        <div className="space-y-6">
          <Ghost className="mx-auto h-[42px] w-full max-w-md rounded-full" />
          <SpectrumTabs />
          <SpectrumChartSkeleton />
          <div className="@min-[640px]:hidden"><SpectrumBucketSkeleton /></div>
          <div aria-hidden className={`relative ${SPECTRUM_GUIDE_CLASS}`}>
            <span className="invisible">{tSpectrum("guide", { influence: 40, count: 999 })}</span>
            <Ghost className="absolute inset-x-0 top-1 mx-auto h-3 w-3/4 max-w-sm" />
          </div>
        </div>
      </SkeletonFrame>
    </div>
  );
}
