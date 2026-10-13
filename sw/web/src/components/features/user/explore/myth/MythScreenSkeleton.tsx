"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import HubSection from "@/components/shared/HubSection";
import { Ghost, SkeletonFrame } from "../hub/ExploreSkeleton";
import { ATLAS_NAV_LAYOUT } from "./atlasNavigationData";
import { MYTH_LAYOUT as layout } from "./mythLayout";
import AtlasMemberControls from "./AtlasMemberControls";
import AtlasBookShelfSkeleton from "./AtlasBookShelfSkeleton";
import SceneCompletionBadge from "./SceneCompletionBadge";

interface Props {
  title?: string;
  hasArtwork?: boolean;
  faction?: boolean;
  heading?: string;
  headline?: string | null;
  memberCount?: number;
  scenesComplete?: boolean;
}

export default function MythScreenSkeleton({ title, hasArtwork = true, faction = false,
  heading, headline, memberCount, scenesComplete = false }: Props = {}) {
  const t = useTranslations("explore.hub.myth");
  const common = useTranslations("common");
  const groupId = faction ? "faction" : "myth";
  const reservedMembers = memberCount ?? 12;

  return (
    <SkeletonFrame label={`${title ?? t("title")} · ${common("loading")}`} className={layout.shell}>
      <div aria-hidden data-atlas-skeleton>
        <div className={layout.navigationOuter}>
          <HubSection title={heading ?? <Ghost className="h-7 w-44 md:h-8" />} index={0} total={4} hideDivider groupId={groupId}
            headerActions={scenesComplete ? <SceneCompletionBadge /> : undefined}
            subtitle={headline === null ? undefined : headline ? <span className="text-accent">{headline}</span> : <span aria-hidden className="block h-[21px] w-64 max-w-full rounded bg-white/[0.06] md:h-[26px]" />}>
            <div className={layout.selectionPanel}>
              <div className={cn(layout.selectionDetails, !hasArtwork && layout.selectionWithoutArtwork)}>
                <div className={layout.selectionControls}>
                  <div className={ATLAS_NAV_LAYOUT.root}>
                    {[0, 1, 2].map(level => <div key={level} className={ATLAS_NAV_LAYOUT.row}>
                      <Ghost className="m-auto hidden h-3 w-6 md:block" /><Ghost className="m-auto h-3 w-2" /><Ghost className="m-auto h-3 w-3/4" /><Ghost className="m-auto h-3 w-2" />
                    </div>)}
                    <div className={ATLAS_NAV_LAYOUT.footer}><Ghost className="h-10 flex-1 rounded-lg" /></div>
                  </div>
                  {faction && <Ghost className="mx-auto h-9 w-56 max-w-full" />}
                </div>
                {hasArtwork && <div className={layout.selectionArtwork}><Ghost className={layout.overviewImage} /></div>}
              </div>
            </div>
          </HubSection>
        </div>
        {reservedMembers > 0 && <>
          <div className={layout.membersOuter}>
            <HubSection title={memberCount === undefined ? <Ghost className="h-7 w-44 md:h-8" /> : `${t("memberList")} (${t("groupMemberCount", { count: memberCount })})`}
              headerActions={<AtlasMemberControls disabled />} index={1} total={4} groupId={groupId}>
              <div className={layout.memberList}>
                {Array.from({ length: Math.min(12, reservedMembers) }, (_, index) => (
                  <div key={index} className="flex min-w-0 flex-col items-center">
                    <Ghost className="aspect-square w-full rounded-xl" />
                    <div className="mt-1.5 w-full px-0.5">
                      <div className={layout.memberName}><Ghost className="mx-auto h-[15px] w-3/4 md:h-[17.5px]" /></div>
                      <div className={layout.memberTitle}><Ghost className="mx-auto h-[13.75px] w-5/6 md:h-[15px]" /></div>
                    </div>
                  </div>
                ))}
              </div>
              {reservedMembers > 12 && <Ghost className="mt-6 h-11 w-full rounded-xl md:mt-7" />}
            </HubSection>
          </div>
          <div className={faction ? layout.factionShelfOuter : layout.overviewOuter}>
            <HubSection title={<Ghost className="h-7 w-28 md:h-8" />} index={2} total={4} groupId={groupId}>
              <AtlasBookShelfSkeleton />
            </HubSection>
          </div>
        </>}
      </div>
    </SkeletonFrame>
  );
}
