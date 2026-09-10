import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import BackToLibraryLink from "./BackToLibraryLink";
import RecordsDeck from "./RecordsDeck";
import { recordsPath } from "./recordsPageData";

export interface RecordsLabels {
  title: string;
  back: string;
  previous: string;
  next: string;
  page: string;
  source: string;
  emptyReview: string;
  spoiler: string;
  originalLanguage: string;
  introduction: string;
  myReview: string;
}

interface Props {
  slug: string;
  locale: string;
  contents: GetUserContentsResponse;
  /** content_id별 작품 소개(줄거리). 없으면 null */
  descriptions: Record<string, string | null>;
  /** 인물 상세의 펼쳐보기에서 보던 작품 — 있으면 그 작품부터 연다 */
  initialFocusContentId?: string;
  labels: RecordsLabels;
}

const LINK_CLASS = "text-accent underline underline-offset-4 hover:text-accent-hover";

/** 이 페이지 머리(h-12)와 RecordsDeck의 카드 머리가 겹치지 않게 딱 붙어 쌓인다.
 *  값을 바꾸면 RecordsDeck.tsx의 sticky top도 같이 맞춰야 한다. */
export const PAGE_HEADER_HEIGHT_CLASS = "h-12";

export default function RecordsPageBody({ slug, locale, contents, descriptions, initialFocusContentId, labels }: Props) {
  const prefix = locale === "en" ? "/en" : "";
  return (
    <>
      {/* 페이지 머리 — 길게 스크롤해도 화살표·제목이 늘 보이게 sticky. 화살표는 왼쪽에
          따로 띄우고, 제목은 화살표와 무관하게 줄 한가운데를 그대로 차지한다 */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[color-mix(in_srgb,var(--color-bg-main)_92%,transparent)] backdrop-blur-md">
        <div className={`relative mx-auto flex ${PAGE_HEADER_HEIGHT_CLASS} max-w-3xl items-center justify-center px-4 lg:max-w-4xl`}>
          <BackToLibraryLink
            href={`${prefix}/celeb/${encodeURIComponent(slug)}?instant=1#library`}
            label={labels.back}
            className="absolute left-4 flex size-8 items-center justify-center rounded-full border border-white/15 text-text-primary hover:border-accent hover:text-accent"
          />
          <h1 className="max-w-[75%] truncate text-base font-bold text-text-primary sm:text-lg">{labels.title}</h1>
        </div>
      </div>

      <section className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:pb-16 lg:max-w-4xl">
        {/* 쪽이 하나뿐이면 "1 / 1쪽"이라 알려줄 게 없다 */}
        {contents.totalPages > 1 && <p className="text-sm text-text-secondary">{labels.page}</p>}
        {/* 20건이 한 쪽에 실려도 한 번에 다 펼치지 않는다 — 이 서버 HTML 자체엔 전량이
            그대로 있어 검색엔진은 지금처럼 다 읽되(SEO), 사람에겐 한 건씩 옆으로 넘겨 보인다 */}
        <div className={contents.totalPages > 1 ? "mt-6" : ""}>
          <RecordsDeck locale={locale} items={contents.items} descriptions={descriptions}
            initialFocusContentId={initialFocusContentId} labels={labels} />
        </div>
        {/* 쪽이 하나뿐이면 이전/다음 둘 다 못 눌러 가운데 "1 / 1쪽" 글자만 덩그러니 남는다 — 그럴 땐 아예 걷는다 */}
        {contents.totalPages > 1 && (
          <nav aria-label={labels.page} className="mt-10 flex items-center justify-between gap-4 text-sm">
            <span>{contents.page > 1 && <a rel="prev" href={recordsPath(slug, contents.page - 1, locale)} className={LINK_CLASS}>{labels.previous}</a>}</span>
            <span className="text-text-secondary">{labels.page}</span>
            <span>{contents.page < contents.totalPages && <a rel="next" href={recordsPath(slug, contents.page + 1, locale)} className={LINK_CLASS}>{labels.next}</a>}</span>
          </nav>
        )}
      </section>
    </>
  );
}
