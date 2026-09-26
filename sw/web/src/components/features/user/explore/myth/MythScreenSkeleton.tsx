"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Ghost, SkeletonFrame } from "../hub/ExploreSkeleton";
import { ATLAS_NAV_LAYOUT } from "./atlasNavigationData";
import { MYTH_LAYOUT as layout } from "./mythLayout";

export default function MythScreenSkeleton({ title, hasArtwork = true }: { title?: string; hasArtwork?: boolean } = {}) {
  const t = useTranslations("explore.hub.myth");
  const common = useTranslations("common");

  return (
    <SkeletonFrame label={`${title ?? t("title")} · ${common("loading")}`} className={layout.shell}>
      <div aria-hidden="true">
        <div className={layout.navigationOuter}>
          <div className={layout.selectionPanel}>
            <div className={cn(layout.selectionDetails, !hasArtwork && layout.selectionWithoutArtwork)}>
              <div className={layout.selectionControls}>
                <div className={ATLAS_NAV_LAYOUT.root}>
                  {[0, 1, 2].map((level) => <div key={level} className={ATLAS_NAV_LAYOUT.row}>
                    <Ghost className="m-auto h-3 w-2" /><div className="flex flex-col items-center justify-center gap-2"><Ghost className="hidden h-3 w-1/3 md:block" /><Ghost className="h-3 w-3/4" /></div><Ghost className="m-auto h-3 w-2" />
                  </div>)}
                  <div className={ATLAS_NAV_LAYOUT.footer}><Ghost className="h-10 flex-1 rounded-lg" /><Ghost className="h-10 flex-1 rounded-lg" /></div>
                </div>
              </div>
              {hasArtwork && <div className={layout.selectionArtwork}><Ghost className={layout.overviewImage} /></div>}
            </div>
          </div>
        </div>
        <div className={layout.membersOuter}>
          <div className={layout.container}>
            <div className="mb-4 flex h-7 items-center gap-3"><Ghost className="h-5 w-28" /><Ghost className="h-3 w-10" /></div>
            <div className={layout.memberList}>
              {Array.from({ length: 12 }, (_, index) => (
                <div key={index} className="flex min-w-0 flex-col items-center">
                  <Ghost className="aspect-square w-full rounded-xl" />
                  <Ghost className="mt-3 h-4 w-3/4" /><Ghost className="mt-2 h-3 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SkeletonFrame>
  );
}
