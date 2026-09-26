/*
  파일명: /app/(main)/explore/works/sections.tsx
  기능: 서가 허브 구획 — 각 레인이 도는 조회와 실패·빈 자리 처리
  책임: 인기 작품·기관 선정 구획은 조회를 스스로 감싸 실패·빈 자리를 대신 세운다.
        학당 카드는 정적 상수라 즉시 뜬다 — 로그인 진도(사용자별 비캐시)만 별도로 조회해
        이어보기 지름길을 채우는 작은 조각을 여기서 낸다.
*/ // ------------------------------

import { getLocale, getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { RetryBlock } from "@/components/ui/pending";
import { getBestsellers, getChosenLibrary, getCuratedHub } from "@/actions/library";
import { getAcademyLessonProgressState } from "@/actions/library/academyProgress";
import type { CuratedHub } from "@/actions/library/types";
import PopularPreview from "@/components/features/library/hub/PopularPreview";
import CuratedHubBrowse from "@/components/features/library/hub/CuratedHubBrowse";

const EMPTY_CLASS = "text-sm text-text-secondary text-center py-8";

/** 허브에 세우는 판매 순위 권수 — 나머지는 인기 작품 화면으로 안내한다 */
const POPULAR_PREVIEW_COUNT = 5;
/** 허브에 세우는 불후의 명작 수 — 카드 격자 한 줄(6열)을 채운다 */
const CLASSICS_PREVIEW_COUNT = 6;

export async function PopularSection() {
  const locale = await getLocale();
  // 두 모드를 함께 미리 세운다 — 명작 조회는 자체 폴백이 빈 결과를 돌려주므로 판매 순위만 실패를 따로 처리한다
  const [data, classics] = await Promise.all([
    getBestsellers('ALL', locale).catch((error: unknown) => {
      console.error("[library] 인기 작품 조회 실패:", error);
      return null;
    }),
    getChosenLibrary({ page: 1, limit: CLASSICS_PREVIEW_COUNT }),
  ]);

  if (!data) return <RetryBlock />;

  return (
    <PopularPreview
      {...data}
      items={data.items.slice(0, POPULAR_PREVIEW_COUNT)}
      restCount={Math.max(0, data.items.length - POPULAR_PREVIEW_COUNT)}
      classics={classics.contents}
      classicsRestCount={Math.max(0, classics.total - classics.contents.length)}
    />
  );
}

export async function CuratedSection() {
  let hub: CuratedHub;
  try {
    hub = await getCuratedHub();
  } catch (error) {
    console.error("[library] 기관 선정 조회 실패:", error);
    return <RetryBlock />;
  }

  if (hub.curators.length === 0) {
    const t = await getTranslations("pending");
    return <p className={EMPTY_CLASS}>{t("empty")}</p>;
  }
  return <CuratedHubBrowse hub={hub} />;
}

/** 학당 이어보기 지름길 — 로그인 상태가 아니거나 조회에 실패하면 조용히 아무것도 세우지 않는다.
 *  카드 본문은 이미 그려져 있으므로 여기서 재시도 안내를 세우지 않는다. */
export async function AcademyContinueLink() {
  let isSignedIn: boolean;
  try {
    ({ isSignedIn } = await getAcademyLessonProgressState());
  } catch (error) {
    console.error("[library] 학당 로그인 진도 조회 실패:", error);
    return null;
  }

  if (!isSignedIn) return null;

  const tHub = await getTranslations("library.hub");
  return (
    <div className="flex justify-center">
      <Link
        href="/explore/works/academy"
        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-semibold hover:bg-accent hover:text-[#121212] transition-colors duration-300"
      >
        {tHub("continueLearning")}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
