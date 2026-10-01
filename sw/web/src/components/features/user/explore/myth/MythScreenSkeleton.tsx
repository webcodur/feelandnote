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
            {/* 실화면의 구획 머리(HubSection) — 번호 대시 + 이름 + 한 줄 정의가 한 덩어리로 선다.
                로딩 때도 자리를 잡아 제목이 튀지 않게 한다 */}
            <div className="mb-6 flex flex-col items-center gap-2 px-1 md:mb-10 md:gap-3">
              <Ghost className="h-4 w-20 rounded-full" />
              <Ghost className="h-7 w-44 md:h-8" />
              <Ghost className="h-5 w-64 max-w-[75%]" />
            </div>
            <div className={cn(layout.selectionDetails, !hasArtwork && layout.selectionWithoutArtwork)}>
              <div className={layout.selectionControls}>
                <div className={ATLAS_NAV_LAYOUT.root}>
                  {[0, 1, 2].map((level) => <div key={level} className={ATLAS_NAV_LAYOUT.row}>
                    <Ghost className="m-auto hidden h-3 w-6 md:block" /><Ghost className="m-auto h-3 w-2" /><Ghost className="m-auto h-3 w-3/4" /><Ghost className="m-auto h-3 w-2" />
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
            {/* 구획 머리(HubSection)와 같은 쌓기 — 번호 대시 + 명단 이름 + 인원 */}
            <div className="mb-3 flex flex-col items-center gap-2">
              <Ghost className="h-0.5 w-8 rounded-full" />
              <Ghost className="h-6 w-28 md:h-7" />
              <Ghost className="h-5 w-36" />
            </div>
            <div className={layout.memberList}>
              {Array.from({ length: 12 }, (_, index) => (
                <div key={index} className="flex min-w-0 flex-col items-center">
                  <Ghost className="aspect-square w-full rounded-xl" />
                  <Ghost className="mt-2.5 h-5 w-3/4" /><Ghost className="mt-1 h-4 w-5/6" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* 책장 구획 — 같은 구분선 리듬 위에 중앙 제목·모드 탭·카드 행이 선다 */}
        <div className={layout.overviewOuter}>
          <div className={layout.container}>
            <div className={layout.sectionDivider}>
              {/* 책장 머리(CenteredSectionHeading) — 대시+제목, mb-3/md:mb-5 */}
              <div className="mb-3 flex flex-col items-center gap-2 md:mb-5">
                <Ghost className="h-0.5 w-8 rounded-full" />
                <Ghost className="h-6 w-24 md:h-7" />
              </div>
              {/* 모드 탭 + 안내문 덩어리 — headerTabs의 mb-4/md:mb-6 */}
              <div className="mb-4 flex flex-col items-center gap-2 md:mb-6">
                <Ghost className="h-9 w-64 max-w-full rounded-full" />
                <Ghost className="h-5 w-72 max-w-full" />
              </div>
              {/* 카드 — 좁은 화면은 가로 넘김 레일, 넓은 화면은 가운데 줄바꿈(AffiliateBookList와 같은 폭) */}
              <div className="flex justify-start gap-3 overflow-hidden md:flex-wrap md:justify-center md:gap-5">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="flex w-36 shrink-0 flex-col items-center md:w-[180px]">
                    <Ghost className="aspect-[3/4] w-full rounded-lg" />
                    <Ghost className="mt-2 h-3.5 w-3/4" /><Ghost className="mt-1.5 h-3 w-1/2" />
                    <Ghost className="mt-2 h-6 w-full rounded-md" />
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
