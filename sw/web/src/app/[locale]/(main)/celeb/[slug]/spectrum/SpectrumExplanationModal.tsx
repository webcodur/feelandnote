"use client";

import { useTranslations } from "next-intl";
import type { SimilarByCelebResult } from "@/actions/spectrum/getSimilarByCelebId";
import { Modal } from "@/components/ui";
import type { SpectrumJsonb } from "@/lib/spectrum/types";
import { SpectrumHighlights } from "./SpectrumHighlights";
import type { useSpectrumMetricPanels } from "./SpectrumMetricPanels";

export type SpectrumExplanationMode = "ability" | "disposition" | "virtue";

interface Props {
  mode: SpectrumExplanationMode | null;
  onModeChange: (mode: SpectrumExplanationMode) => void;
  onClose: () => void;
  groups: ReturnType<typeof useSpectrumMetricPanels>["explanationGroups"];
  spectrumJsonb: SpectrumJsonb | null;
  highlights: SimilarByCelebResult["highlights"];
  population: number;
}

export default function SpectrumExplanationModal({ mode, onModeChange, onClose, groups, spectrumJsonb, highlights, population }: Props) {
  const t = useTranslations("celebPage");
  const modes = [
    { key: "ability", label: t("ability") },
    { key: "disposition", label: t("coreDisposition") },
    { key: "virtue", label: t("virtue") },
  ] as const;

  return (
    <Modal isOpen={mode !== null} onClose={onClose} title={t("profileAxes")} size="xl" stickyHeader animateHeight={false}>
      <div className="space-y-5 p-5">
        <div className="grid grid-cols-3 gap-1 rounded-control border border-line bg-bg-raised p-1">
          {modes.map((item) => (
            <button key={item.key} type="button" aria-pressed={mode === item.key} onClick={() => onModeChange(item.key)} className={`min-h-11 rounded-control px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${mode === item.key ? "bg-accent/15 text-accent" : "text-text-secondary hover:bg-bg-card hover:text-text-primary"}`}>
              {item.label}
            </button>
          ))}
        </div>
        <SpectrumHighlights spectrumJsonb={spectrumJsonb} highlights={highlights} population={population} />
        {groups.filter((group) => group.mode === mode).map((group) => (
          <section key={group.title} aria-label={group.title} className="space-y-4">
            {mode === "virtue" && <h4 className="text-center text-base text-text-primary">{group.title}</h4>}
            {group.items.map((item) => (
              <div key={item.key}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm text-text-primary"><span>{item.label}</span><span className="tabular-nums">{item.value}</span></div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">{item.reason || group.emptyLabel}</p>
              </div>
            ))}
          </section>
        ))}
      </div>
    </Modal>
  );
}
