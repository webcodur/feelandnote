"use client";

import type { ReactNode } from "react";
import type { Myth } from "@/actions/home/mythTypes";
import AtlasNavigation from "../myth/AtlasNavigation";
import AtlasOverview from "./AtlasOverview";
import HubSection from "@/components/shared/HubSection";
import type { AtlasSelection, AtlasTheme, AtlasWorld } from "../myth/atlasNavigationData";
import { MYTH_LAYOUT as layout } from "../myth/mythLayout";

interface Props {
  mode: AtlasWorld;
  tree: AtlasTheme[];
  selection: AtlasSelection;
  onSelect: (selection: AtlasSelection) => void;
  onOpenPicker: (level: number) => void;
  pending: boolean;
  myth: Myth | null;
  ownsTitle: boolean;
  sectionTitle: string;
  sectionIndex: number;
  sectionTotal: number;
  participation?: ReactNode;
  badge?: ReactNode;
}

/** 지역·테마 → 신화·세력 제목·소개·장면. 두 모드가 같은 배치를 쓴다. */
export default function AtlasSelection({ mode, myth, ownsTitle, sectionTitle, sectionIndex, sectionTotal, participation, badge, ...navigation }: Props) {
  const heading = <AtlasNavigation {...navigation} myth={mode === "myth"} levels={[1]} titleAs={ownsTitle && myth ? "h1" : "h2"} />;
  return (
    <HubSection id="atlas-selection" title={sectionTitle} index={sectionIndex} total={sectionTotal} hideDivider>
      <div className={layout.selectionStack} data-atlas-selection>
        <AtlasNavigation {...navigation} myth={mode === "myth"} levels={[0]} />
        {myth ? (
          <AtlasOverview key={myth.id} myth={myth}
            navigation={
              <div className={layout.selectionHeader}>
                {heading}
                {badge}
                {myth.headline && <p className="max-w-xl break-keep text-sm leading-relaxed text-accent md:text-base">{myth.headline}</p>}
                <div className={layout.actions}>
                  {participation}
                </div>
              </div>
            } />
        ) : heading}
      </div>
    </HubSection>
  );
}
