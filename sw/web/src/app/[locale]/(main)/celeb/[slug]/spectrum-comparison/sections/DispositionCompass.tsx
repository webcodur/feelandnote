"use client";

import { useTranslations } from "next-intl";

import type { TendencyKey } from "@/lib/spectrum/constants";
import type { SpectrumMatchEvidence } from "@/lib/spectrum/utils";
import { cn } from "@/lib/utils";
import {
  CANDIDATE_COLOR,
  ChartFrame,
  SUBJECT_COLOR,
  TENDENCY_ENDPOINTS,
  isTendencyAxis,
} from "../shared";
import type { CompassChartProps } from "../types";

export default function DispositionCompass({
  data,
  subjectName,
  candidateName,
  title,
  opposite,
  twoColumn = false,
}: CompassChartProps) {
  const t = useTranslations("celebPage");
  const tl = useTranslations("shared.spectrum.tendency_label");
  const tendencyData = data.filter(
    (evidence): evidence is SpectrumMatchEvidence & { axis: TendencyKey } =>
      isTendencyAxis(evidence.axis),
  );

  if (!tendencyData.length) return null;

  const positionFor = (value: number) => {
    const normalized = (Math.max(-50, Math.min(50, value)) + 50) / 100;
    return 2 + normalized * 96;
  };

  const formatValue = (
    value: number,
    endpoints: (typeof TENDENCY_ENDPOINTS)[TendencyKey],
  ) => {
    const signedValue = value > 0 ? `+${value}` : String(value);
    if (Math.abs(value) <= 10) {
      return `${t("spectrumMatchModalNeutral")} ${signedValue}`;
    }
    return `${tl(value < 0 ? endpoints[0] : endpoints[1])} ${signedValue}`;
  };

  return (
    <ChartFrame title={title} hint={t("spectrumMatchGraphicDispositionHint")}>
      <div
        className={cn(
          "mx-auto mt-2.5 grid w-full gap-2.5 pb-0.5",
          twoColumn && "@min-[500px]:grid-cols-2",
        )}
      >
        {tendencyData.map((evidence) => {
          const endpoints = TENDENCY_ENDPOINTS[evidence.axis];
          const targetPosition = positionFor(evidence.targetValue);
          const candidatePosition = positionFor(evidence.candidateValue);
          const connectorStart = Math.min(targetPosition, candidatePosition);
          const connectorWidth = Math.abs(targetPosition - candidatePosition);
          const gap = Math.abs(
            opposite
              ? -evidence.targetValue - evidence.candidateValue
              : evidence.targetValue - evidence.candidateValue,
          );

          return (
            <section
              key={evidence.axis}
              className="border border-white/[0.1] bg-black/15 px-3.5 py-3"
              aria-label={`${tl(endpoints[0])} - ${tl(endpoints[1])}: ${subjectName} ${evidence.targetValue}, ${candidateName} ${evidence.candidateValue}`}
            >
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <strong className="text-left text-sm text-text-primary">
                  {tl(endpoints[0])}
                </strong>
                <span
                  className={cn(
                    "border px-2 py-0.5 font-mono text-xs font-semibold",
                    opposite
                      ? "border-rose-300/25 bg-rose-400/[0.07] text-rose-200"
                      : "border-white/10 bg-white/[0.035] text-text-primary/70",
                  )}
                >
                  {t(
                    opposite
                      ? "spectrumMatchModalMirrorGap"
                      : "spectrumMatchModalGap",
                    { value: gap },
                  )}
                </span>
                <strong className="text-right text-sm text-text-primary">
                  {tl(endpoints[1])}
                </strong>
              </div>

              <div className="relative mt-2 h-7" aria-hidden="true">
                <div className="absolute inset-x-0 top-3 h-px bg-white/25" />
                <div className="absolute bottom-1 left-1/2 top-1 w-px bg-white/25" />
                <div className="absolute left-0 top-2 h-2.5 w-px bg-white/40" />
                <div className="absolute right-0 top-2 h-2.5 w-px bg-white/40" />
                <div
                  className={cn(
                    "absolute top-[11px] h-[3px]",
                    opposite ? "bg-rose-300/55" : "bg-white/25",
                  )}
                  style={{
                    left: `${connectorStart}%`,
                    width: `${connectorWidth}%`,
                  }}
                />
                <span
                  className="absolute top-[6px] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 bg-[#091115] shadow-[0_0_10px_rgba(216,186,104,0.28)]"
                  style={{
                    left: `${targetPosition}%`,
                    borderColor: SUBJECT_COLOR,
                  }}
                />
                <span
                  className="absolute top-[9px] h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-2 bg-[#091115] shadow-[0_0_10px_rgba(131,201,220,0.24)]"
                  style={{
                    left: `${candidatePosition}%`,
                    borderColor: CANDIDATE_COLOR,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[13px] font-semibold">
                <span
                  className="flex min-w-0 items-center gap-1.5 border border-white/[0.07] bg-white/[0.025] px-2 py-1.5"
                  style={{ color: SUBJECT_COLOR }}
                >
                  <i className="h-2 w-2 shrink-0 rounded-full bg-current" />
                  <span className="truncate">
                    {formatValue(evidence.targetValue, endpoints)}
                  </span>
                </span>
                <span
                  className="flex min-w-0 items-center justify-end gap-1.5 border border-white/[0.07] bg-white/[0.025] px-2 py-1.5 text-right"
                  style={{ color: CANDIDATE_COLOR }}
                >
                  <i className="h-2 w-2 shrink-0 rotate-45 bg-current" />
                  <span className="truncate">
                    {formatValue(evidence.candidateValue, endpoints)}
                  </span>
                </span>
              </div>
            </section>
          );
        })}
      </div>
    </ChartFrame>
  );
}
