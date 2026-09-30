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
                  {/* 맨 위 줄은 세계 전환(신화의 세계 | 세력도감) — 아래 세 줄 위에 서는 두 칸 */}
                  <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/20 bg-bg-main p-1">
                    <Ghost className="h-9 rounded-md" /><Ghost className="h-9 rounded-md" />
                  </div>
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
          <div className={`${layout.container} ${layout.sectionDivider}`}>
            {/* 실화면의 중앙 정렬 구획 머리(아이콘+제목, 그 아래 인원 설명)와 같은 자리·높이 */}
            <div className="mb-3 flex flex-col items-center gap-2"><Ghost className="h-5 w-24" /><Ghost className="h-3 w-32" /></div>
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
        {/* 책장 구획 — 같은 구분선 리듬 위에 중앙 제목·모드 탭·카드 행이 선다 */}
        <div className={layout.overviewOuter}>
          <div className={layout.container}>
            <div className={layout.sectionDivider}>
              <div className="mb-4 flex flex-col items-center gap-2 md:mb-6"><Ghost className="h-5 w-20" /><Ghost className="h-9 w-64 max-w-full rounded-full" /></div>
              <div className="flex flex-wrap justify-center gap-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="flex w-28 flex-col items-center sm:w-32">
                    <Ghost className="aspect-[3/4] w-full rounded-lg" />
                    <Ghost className="mt-2 h-3.5 w-3/4" /><Ghost className="mt-1.5 h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SkeletonFrame>
  );
}
