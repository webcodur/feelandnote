"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { InfluenceExplorerData } from "@/actions/home/getInfluenceExplorer";
import InfluenceExplorer from "./InfluenceExplorer";
import { MatchGroupsButton } from "./spectrum/SpectrumPanels";

export default function InfluenceComparisonButtons({ data }: { data: InfluenceExplorerData }) {
  const t = useTranslations("profilePage.influence.explorer");
  const [mode, setMode] = useState<"ranking" | "leaders" | null>(null);

  return (
    <>
      <MatchGroupsButton label={t("rankingButton")} className="mt-0" onClick={() => setMode("ranking")} />
      <MatchGroupsButton label={t("leadersButton")} className="mt-0" onClick={() => setMode("leaders")} />
      {mode && <InfluenceExplorer data={data} initialMode={mode} onClose={() => setMode(null)} />}
    </>
  );
}
