"use client";

import type { ComponentProps } from "react";
import type { TimelineCeleb } from "@/actions/home";
import type { EraInfo } from "../utils";
import EraBanner from "./EraBanner";
import CelebTimelineItem from "./CelebTimelineItem";

export default function TimelineEraList({ groups, collapsedEras, onToggleEra, itemProps }: {
  groups: { era: EraInfo; celebs: TimelineCeleb[] }[]; collapsedEras: Set<string>;
  onToggleEra: (key: string) => void; itemProps: Omit<ComponentProps<typeof CelebTimelineItem>, 'celeb' | 'isBioExpanded' | 'isContemporariesShown' | 'isContemporariesLoading'> & {
    expandedBio: Set<string>; showContemporaries: Set<string>; loadingContemporaries: Set<string>;
  };
}) {
  const { expandedBio, showContemporaries, loadingContemporaries, ...callbacks } = itemProps;
  return <div className="relative">
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
    </div>;
}
