"use client";

import { useTranslations } from "next-intl";
import HubSection from "@/components/shared/HubSection";
import { Ghost, SkeletonFrame } from "../hub/ExploreSkeleton";
import type { AtlasWorld } from "../myth/atlasNavigationData";
import { MYTH_LAYOUT as layout } from "../myth/mythLayout";
import AtlasMemberControls from "../myth/AtlasMemberControls";
import AtlasBookShelfSkeleton from "../myth/AtlasBookShelfSkeleton";
import SceneCompletionBadge from "../myth/SceneCompletionBadge";
import AtlasMemberViewToggle from "../myth/members/AtlasMemberViewToggle";

interface Props {
  title?: string;
  hasArtwork?: boolean;
  mode: AtlasWorld;
  heading?: string;
  headline?: string | null;
  memberCount?: number;
  scenesComplete?: boolean;
}

export default function AtlasScreenSkeleton({ mode, title, hasArtwork = true,
  heading, headline, memberCount, scenesComplete = false }: Props) {
  const common = useTranslations("common");
  const t = useTranslations("explore.hub.myth");
  const labels = useTranslations(mode === "myth" ? "explore.hub.myth" : "explore.faction");
  const reservedMembers = memberCount ?? 12;
  const sectionTotal = reservedMembers > 0 ? 4 : 2;
  const memberCards = <>
    <div className={layout.descriptionList}>
      {Array.from({ length: Math.min(12, reservedMembers) }, (_, index) => (
        <div key={index} data-member-image="portrait" className={layout.descriptionRow}>
          <Ghost className="aspect-[4/5] w-full rounded-xl md:row-span-2" />
          <div className="space-y-3 self-center md:self-start">
            <Ghost className="h-6 w-32 max-w-full" />
            <Ghost className="h-4 w-40 max-w-full" />
          </div>
          <div className="col-span-2 space-y-3 py-1 md:col-span-1 md:col-start-2 md:row-start-2">
            <Ghost className="h-3.5 w-full" /><Ghost className="h-3.5 w-full" /><Ghost className="h-3.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
    {reservedMembers > 12 && <Ghost className="mt-6 h-11 w-full rounded-xl md:mt-7" />}
  </>;

  return (
    <SkeletonFrame label={`${title ?? labels("title")} · ${common("loading")}`} className={layout.shell}>
      <div aria-hidden data-atlas-skeleton data-atlas-mode={mode}>
        <HubSection id="atlas-selection" title={t("tocSelection")} index={0} total={sectionTotal} hideDivider>
          <div className={layout.selectionStack}>
            <Ghost className="mx-auto h-[4.5rem] w-full max-w-[420px] rounded-control" />
            <div className={layout.selectionHeader}>
              <div className="flex min-h-[4.5rem] w-full max-w-[420px] flex-col items-center justify-center gap-1 rounded-control border border-line-strong bg-bg-main py-2.5">
                <Ghost className="h-4 w-8" />
                <h2 className="text-xl font-semibold md:text-2xl">{heading ?? <Ghost className="h-7 w-64 md:h-8" />}</h2>
              </div>
              {scenesComplete && <SceneCompletionBadge />}
              {headline !== null && (headline ? <p className="text-sm text-accent md:text-base">{headline}</p> : <Ghost className="h-5 w-64" />)}
              <div className={layout.actions}>
                <Ghost className="h-9 w-20" />
                {Array.from({ length: 2 }, (_, index) => <Ghost key={index} className="h-10 w-24 rounded-control" />)}
              </div>
            </div>
            {hasArtwork && <Ghost className="aspect-[3/2] w-full rounded-xl md:aspect-[2/1]" />}
          </div>
        </HubSection>
        <HubSection id="atlas-overview" title={labels(mode === "myth" ? "mythOverview" : "overview")} index={1} total={sectionTotal}>
          <Ghost className="mx-auto mb-5 h-5 w-40" />
          <div className={`${layout.overviewText} space-y-3`}>
            {Array.from({ length: 5 }, (_, index) => <Ghost key={index} className="h-4 w-full" />)}
            <Ghost className="h-4 w-2/3" />
          </div>
          <Ghost className="mx-auto mt-6 h-11 w-20 rounded-control md:mt-8" />
        </HubSection>
        {reservedMembers > 0 && <>
          <HubSection id="atlas-members" title={t("memberList")} index={2} total={sectionTotal} className={layout.members}
            headerFooter={<div className={layout.memberHeader}>
              <div className="flex h-[4.5rem] w-full max-w-[420px] flex-col items-center justify-center gap-1 rounded-control border border-line-strong bg-bg-main"><div className="flex items-center gap-2"><Ghost className="h-4 w-8" /><Ghost className="h-4 w-10" /></div><Ghost className="h-6 w-32 md:h-7" /></div>
              <div className={layout.memberControls}>
                <AtlasMemberControls disabled hideSteppers />
                <AtlasMemberViewToggle showDescription imageMode="portrait" onDescriptionChange={() => {}} onImageModeChange={() => {}} />
              </div>
            </div>}>
            {memberCards}
            <Ghost className="mx-auto mt-6 h-[4.5rem] w-full max-w-[420px] rounded-control md:hidden" />
          </HubSection>
          <div className={layout.overviewOuter}>
            <HubSection title={labels("worksTitle")} index={3} total={sectionTotal} groupId={mode}>
              <AtlasBookShelfSkeleton />
            </HubSection>
          </div>
        </>}
      </div>
    </SkeletonFrame>
  );
}
