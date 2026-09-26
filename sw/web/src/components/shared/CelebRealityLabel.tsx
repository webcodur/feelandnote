"use client";

import { useTranslations } from "next-intl";
import type { CelebReality } from "@feelandnote/shared/constants/celeb-tiers";

export default function CelebRealityLabel({ reality, id }: { reality?: CelebReality | null; id?: string }) {
  const t = useTranslations("celebPage");
  if (!reality || reality === "REAL") return null;
  const labels: Record<CelebReality, string> = {
    REAL: t("realityChipReal"),
    FICTION: t("realityChipFiction"),
    BOTH: `${t("realityChipReal")} · ${t("realityChipFiction")}`,
  };
  return (
    <span id={id} data-celeb-reality={reality} className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-accent/40 bg-bg-main/95 px-2 py-1 text-xs font-semibold leading-none text-accent">
      {labels[reality]}
    </span>
  );
}
