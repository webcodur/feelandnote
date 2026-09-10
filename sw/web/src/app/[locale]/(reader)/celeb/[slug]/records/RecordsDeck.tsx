/* ─────────────────────────────────────────────
 * [celeb 상세] records — 감상 기록 전체보기 낱장 넘김
 * - 목차 위치: records/[page] (감상 기록 전체보기 페이지)
 * - 데이터: RecordsPageBody가 서버에서 읽은 contents.items를 그대로 받는다
 * - 함께 보기: RecordsPageBody.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import ContentImage from "@/components/ui/ContentImage";
import ContentReadingText from "@/components/ui/ContentReadingText";
import FormattedText from "@/components/ui/FormattedText";
import type { RecordsLabels } from "./RecordsPageBody";

interface Props {
  locale: string;
  items: GetUserContentsResponse["items"];
  /** content_id별 작품 소개(줄거리). 없으면 null */
  descriptions: Record<string, string | null>;
  /** 인물 상세의 펼쳐보기에서 보던 작품 — 이 쪽에 있으면 그 작품부터 연다 */
  initialFocusContentId?: string;
  labels: Pick<RecordsLabels, "source" | "emptyReview" | "spoiler" | "originalLanguage" | "previous" | "next" | "introduction" | "myReview">;
}

const LINK_CLASS = "text-accent underline underline-offset-4 hover:text-accent-hover";
const NAV_BUTTON_CLASS = "flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-text-primary hover:border-accent hover:text-accent disabled:cursor-default disabled:opacity-30 disabled:hover:border-white/15 disabled:hover:text-text-primary";
const READING_LABEL_CLASS = "text-xs font-black uppercase tracking-[0.16em] text-3d-gold-bright";
const READING_LABEL_STYLE = { filter: "none" } satisfies CSSProperties;
const REVIEW_SECTION_CLASS = "relative mt-10 border-t border-accent/25 pt-9 sm:mt-14 sm:pt-10";

/**
 * 한 쪽에 최대 20건이 실려 한 번에 다 펼치면 너무 길다. 검색엔진은 이 서버 렌더
 * HTML을 그대로 읽으므로(전량 존재) 크롤은 그대로 두고, 사람에게만 한 건씩
 * 보이는 화면을 얹는다 — SEO 페이지화와 하나씩 읽기 둘 다 잡는다.
 *
 * 옆으로 밀려 넘어가는 연출은 없다 — 단추를 누르면 보이는 카드가 값만 바뀌듯
 * 바로 바뀐다. 대신 카드마다 본문 길이가 달라 높이가 들쭉날쭉하므로, 바뀐
 * 카드의 실제 높이만큼 바깥 상자가 부드럽게 늘거나 준다(자리는 유지, 높이만 애니메이션).
 */
export default function RecordsDeck({ locale, items, descriptions, initialFocusContentId, labels }: Props) {
  const prefix = locale === "en" ? "/en" : "";
  // 이 쪽에 없으면(다른 쪽에 있거나 값을 못 받았으면) 그냥 처음부터 연다
  const [activeIndex, setActiveIndex] = useState(() => {
    const found = initialFocusContentId
      ? items.findIndex((item) => item.content_id === initialFocusContentId)
      : -1;
    return found >= 0 ? found : 0;
  });
  const bodyRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const atStart = activeIndex === 0;
  const atEnd = activeIndex >= items.length - 1;
  const showNav = items.length > 1;

  // 지금 보이는 카드의 본문 실제 높이를 재서 그 상자에 입힌다. 카드가 바뀌면(useEffect는
  // 화면에 그려진 뒤에 돈다) 옛 높이가 한 번 더 그려진 다음 새 높이로 바뀌어,
  // transition이 그 사이를 애니메이션으로 메운다. 머리글은 이 상자 밖에 있어 높이
  // 애니메이션과 무관하게 sticky로 남는다.
  useEffect(() => {
    const active = bodyRef.current;
    if (!active) return;
    const sync = () => setHeight(active.getBoundingClientRect().height);
    sync();
    const resizeObserver = new ResizeObserver(sync);
    resizeObserver.observe(active);
    return () => resizeObserver.disconnect();
  }, [activeIndex]);

  return (
    <div>
      {items.map((item, index) => {
        const isActive = index === activeIndex;
        const review = item.public_record;
        const text = locale === "en" && review?.content_preview_en
          ? review.content_preview_en : review?.content_preview;
        const thumbnail = locale === "en" && item.content.thumbnail_en
          ? item.content.thumbnail_en : item.content.thumbnail_url;
        const description = descriptions[item.content_id];
        return (
          <article key={item.id} data-record-content={item.content_id}
            className={`rounded-xl border border-white/10 bg-card ${isActive ? "" : "hidden"}`}>
            {/* 본문 머리 — 상자에 overflow-hidden을 걸지 않아, 페이지 머리(top-0, h-12)
                바로 밑(top-12)에 붙어 스크롤 내내 함께 sticky로 남는다. 숨은(비활성) 카드의
                머리도 SEO를 위해 그대로 서버 HTML에 남긴다(display:none만 적용) */}
            <div className="sticky top-12 z-10 flex items-center gap-2 rounded-t-xl border-b border-white/10 bg-[color-mix(in_srgb,var(--color-bg-card)_92%,transparent)] px-3 py-4 backdrop-blur-md sm:px-5">
              {showNav ? (
                <button type="button" onClick={() => setActiveIndex((i) => Math.max(0, i - 1))} disabled={atStart}
                  aria-label={labels.previous} className={NAV_BUTTON_CLASS}>
                  <ChevronLeft size={18} aria-hidden />
                </button>
              ) : <span className="size-9 shrink-0" aria-hidden />}
              <div className="min-w-0 flex-1 text-center">
                {showNav && <p className="font-mono text-xs tabular-nums text-text-secondary/70">{activeIndex + 1} / {items.length}</p>}
                <h2 className="text-xl font-semibold text-text-primary lg:text-2xl">
                  <a href={`${prefix}/content/${item.content_id}`} className="hover:text-accent">{item.content.title}</a>
                </h2>
                {item.content.creator && <p className="mt-1 text-sm text-text-secondary lg:text-base">{item.content.creator}</p>}
              </div>
              {showNav ? (
                <button type="button" onClick={() => setActiveIndex((i) => Math.min(items.length - 1, i + 1))} disabled={atEnd}
                  aria-label={labels.next} className={NAV_BUTTON_CLASS}>
                  <ChevronRight size={18} aria-hidden />
                </button>
              ) : <span className="size-9 shrink-0" aria-hidden />}
            </div>

            <div
              ref={isActive ? bodyRef : undefined}
              style={isActive ? ({ height, transition: "height 240ms ease" } as CSSProperties) : undefined}
              className="relative overflow-hidden rounded-b-xl"
            >
              <div className="p-5 sm:p-8 lg:p-10">
                {/* 표지 — 개인 감상평만으로는 뭘 읽었는지 알기 어려워, 무엇을 감상했는지부터 보여준다 */}
                {thumbnail && (
                  <div className="relative mx-auto mb-5 aspect-[2/3] w-24 overflow-hidden rounded-md border border-white/10 bg-bg-secondary shadow-lg sm:w-28">
                    <ContentImage src={thumbnail} alt={item.content.title} sizes="112px" />
                  </div>
                )}
                {/* 작품 소개 — 개인 감상평과 뚜렷이 구분해, 뭘 감상했는지부터 알 수 있게 한다.
                    감상평과 같은 FormattedText로 그려 따옴표·개행 처리를 똑같이 매끈하게 맞춘다.
                    라벨은 본문 글자가 아니라 팻말 취급 — 가운데·금색·강조로 확실히 갈라 보인다. */}
                {description && (
                  <div>
                    <p className={`${READING_LABEL_CLASS} text-center`} style={READING_LABEL_STYLE}>{labels.introduction}</p>
                    <ContentReadingText text={description} tone="secondary" size="reader" className="mt-3" />
                  </div>
                )}
                <div className={description ? REVIEW_SECTION_CLASS : "relative"}>
                  {description && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-accent/75"
                    />
                  )}
                  <div>
                    <p className={`${READING_LABEL_CLASS} text-center`} style={READING_LABEL_STYLE}>{labels.myReview}</p>
                    <ContentReadingText tone="primary" size="reader" className="mt-4">
                      {text && !review?.is_spoiler && <>
                        {locale === "en" && !review?.content_preview_en && <p className="mb-3 text-sm text-text-secondary">{labels.originalLanguage}</p>}
                        <FormattedText text={text} />
                      </>}
                      {text && review?.is_spoiler && <p className="text-text-secondary">{labels.spoiler}</p>}
                      {!text && <p className="text-text-secondary">{labels.emptyReview}</p>}
                    </ContentReadingText>
                    {item.source_url && <p className="mt-6 break-words border-t border-white/10 pt-4 text-sm">
                      <a href={item.source_url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>{labels.source}: {item.source_url}</a>
                    </p>}
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
