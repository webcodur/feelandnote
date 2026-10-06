"use client";

import type { ComponentProps } from "react";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TimelineCeleb } from "@/actions/home";
import type { EraInfo } from "../utils";
import EraBanner from "./EraBanner";
import CelebTimelineItem from "./CelebTimelineItem";

export default function TimelineEraList({ groups, collapsedEras, allCollapsed, onToggleAll, onToggleEra, itemProps }: {
  groups: { era: EraInfo; celebs: TimelineCeleb[] }[]; collapsedEras: Set<string>; allCollapsed: boolean;
  onToggleAll: () => void; onToggleEra: (key: string) => void; itemProps: Omit<ComponentProps<typeof CelebTimelineItem>, 'celeb' | 'isBioExpanded' | 'isContemporariesShown' | 'isContemporariesLoading'> & {
    expandedBio: Set<string>; showContemporaries: Set<string>; loadingContemporaries: Set<string>;
  };
}) {
  const t = useTranslations('explore.ui.timeline');
  const { expandedBio, showContemporaries, loadingContemporaries, ...callbacks } = itemProps;
  return <>
    {groups.length > 1 && <div className="flex justify-end">
      <button type="button" onClick={onToggleAll} className="flex min-h-11 items-center gap-1.5 rounded-control px-3 text-sm text-text-secondary outline-none hover:bg-white/5 hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent">
        {allCollapsed && <ChevronsUpDown size={16} aria-hidden />}
        {!allCollapsed && <ChevronsDownUp size={16} aria-hidden />}
        {t(allCollapsed ? 'expandAll' : 'collapseAll')}
      </button>
    </div>}
    <div className="relative">
      <div className="absolute start-[34px] top-0 bottom-0 w-px bg-white/10 md:start-[114px]" />
      {groups.map(group => {
        const collapsed = collapsedEras.has(group.era.key);
        return <div key={group.era.key} id={'era-' + group.era.key} className="scroll-mt-20">
          <EraBanner era={group.era} count={group.celebs.length} isCollapsed={collapsed} onToggle={onToggleEra} />
          <div className="collapse-grid" data-open={!collapsed}>
            <div className="collapse-inner">
              {group.celebs.map(celeb => <CelebTimelineItem key={celeb.id} celeb={celeb} {...callbacks}
                isBioExpanded={expandedBio.has(celeb.id)} isContemporariesShown={showContemporaries.has(celeb.id)} isContemporariesLoading={loadingContemporaries.has(celeb.id)} />)}
            </div>
          </div>
        </div>;
      })}
    </div>
  </>;
}
