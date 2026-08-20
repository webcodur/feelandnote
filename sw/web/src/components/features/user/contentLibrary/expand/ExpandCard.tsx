/*
  파일명: /components/features/user/contentLibrary/expand/ExpandCard.tsx
  기능: 펼침 보기의 카드 한 장.
  책임: 세 칸을 위에서 아래로 쌓는다 — 표지와 작품 소개, 인물의 감상배경, 작품의 나머지 정보.
        제목과 작품 선택 목록은 카드 밖의 ExpandDetailView가 맡는다.
*/ // ------------------------------
"use client";

import { memo, useState } from "react";
import { Star, ZoomIn } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import ContentImage from "@/components/ui/ContentImage";
import FormattedText from "@/components/ui/FormattedText";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import { getCategoryByDbType } from "@/constants/categories";
import { getLocalizedContent } from "@/lib/utils/editions";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";

import ContentIntro from "./ContentIntro";
import ContentMetaPanel from "./ContentMetaPanel";
import { EXPAND_SECTION_HEADING_CLASS } from "./expandSectionStyles";

interface ExpandCardProps {
  item: UserContentWithContent;
  brief: ContentBrief | null;
  isBriefLoading: boolean;
  /** 화면에 지금 떠 있는 카드인지. 옆에 대기 중인 카드는 표지를 서둘러 받지 않는다 */
  isActive: boolean;
  /** 이 감상배경을 남긴 인물 이름 */
  ownerNickname?: string;
  /** 그 인물의 얼굴 사진 */
  ownerAvatarUrl?: string | null;
}

function ExpandCard({
  item,
  brief,
  isBriefLoading,
  isActive,
  ownerNickname,
  ownerAvatarUrl,
}: ExpandCardProps) {
  const locale = useLocale();
  // 감상문 관련 문구(출처·스포일러·원문 안내)는 목록 카드와 같은 묶음을 쓴다
  const t = useTranslations("content");
  const tExpand = useTranslations("archiveSearch");
  const [isCoverOpen, setIsCoverOpen] = useState(false);

  const { title } = getLocalizedContent(item.content, locale);
  const review = locale === "en" && item.review_en ? item.review_en : item.review;
  const reviewIsOriginalLanguage = locale === "en" && !item.review_en && !!item.review;
  const isSpoiler = item.is_spoiler ?? false;
  const category = getCategoryByDbType(item.content.type)?.id ?? "book";
  const href = `/content/${item.content_id}?category=${category}`;
  const coverUrl = item.content.thumbnail_url;

  return (
    <>
      <article className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-bg-card">
        {/* 윗칸 — 표지와 작품 소개 */}
        <div className="flex flex-col gap-4 p-3 sm:flex-row sm:p-4 md:gap-5 md:p-5">
          {coverUrl ? (
            <button
              type="button"
              onClick={() => setIsCoverOpen(true)}
              aria-label={tExpand("expandCover")}
              className="group relative mx-auto block h-56 w-36 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-white/10 bg-bg-secondary shadow-lg hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 sm:mx-0 sm:h-72 sm:w-48"
            >
              {isActive ? (
                <ContentImage
                  src={coverUrl}
                  alt={title}
                  sizes="(max-width: 640px) 144px, 192px"
                  className="object-contain"
                  loading="eager"
                />
              ) : null}
              <span className="pointer-events-none absolute inset-0 flex items-end justify-end bg-black/0 p-2 group-hover:bg-black/15">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white/70 opacity-0 group-hover:opacity-100">
                  <ZoomIn size={16} aria-hidden />
                </span>
              </span>
            </button>
          ) : (
            <div className="relative mx-auto h-56 w-36 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-bg-secondary shadow-lg sm:mx-0 sm:h-72 sm:w-48">
              <ContentImage
                src={coverUrl}
                alt={title}
                sizes="(max-width: 640px) 144px, 192px"
                className="object-contain"
                loading={isActive ? "eager" : "lazy"}
              />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <ContentIntro brief={brief} isLoading={isBriefLoading} />
          </div>
        </div>

        {/* 가운뎃칸 — 이 인물이 왜 이 작품을 골랐는지.
          이 서비스의 알맹이라 얼굴과 제목으로 무게를 준다. 위 칸들과 바탕색·왼쪽 선으로 갈라 놓는다. */}
        <section className="border-t-2 border-accent/25 bg-accent/[0.04] px-3 py-5 sm:px-4 md:px-5 md:py-6">
          <div className="mb-4 flex items-center gap-3">
            {ownerAvatarUrl && (
              <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-full border border-accent/30 bg-bg-secondary">
                {isActive ? (
                  <ContentImage src={ownerAvatarUrl} alt={ownerNickname ?? ""} sizes="40px" className="object-cover" />
                ) : null}
              </span>
            )}
            <div className="min-w-0">
              <h4 className={EXPAND_SECTION_HEADING_CLASS}>
                {ownerNickname ? tExpand("expandReviewOf", { name: ownerNickname }) : tExpand("expandReview")}
              </h4>
              {item.rating != null && item.rating > 0 && (
                <span className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                  <Star size={13} className="fill-yellow-500 text-yellow-500" />
                  {item.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {review && !isSpoiler && (
            <>
              {reviewIsOriginalLanguage && (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-200">
                  {t("reviewModal.originalLanguage")}
                </p>
              )}
              {/* 긴 감상배경도 문서 흐름에 전부 펼쳐 휠과 터치 스크롤을 한 축으로 유지한다. */}
              <div
                className="min-w-0 w-full whitespace-pre-line break-words font-sans text-[15px] leading-[1.85] text-text-secondary"
              >
                <FormattedText text={review} />
              </div>
            </>
          )}

          {review && isSpoiler && (
            <div className="rounded-lg border border-white/5 bg-white/5 px-4 py-6 text-center text-sm text-text-secondary">
              {t("reviewModal.spoiler")}
            </div>
          )}

          {!review && <p className="text-sm italic text-text-tertiary">{t("reviewModal.noReview")}</p>}

        {/* 출처 */}
          <div className="mt-4 min-w-0 text-sm">
            {item.source_url ? (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                title={item.source_url}
                className="block max-w-full truncate text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                {t("reviewModal.source", { url: item.source_url })}
              </a>
            ) : (
              <span className="font-semibold text-red-500">{t("reviewModal.noSource")}</span>
            )}
          </div>
        </section>

        {/* 아랫칸 — 출판사·출판일·ISBN 등 작품의 나머지 정보 */}
        <ContentMetaPanel
          brief={brief}
          isLoading={isBriefLoading}
          internalHref={href}
          mediaEnabled={isActive}
        />
      </article>

      {isActive && coverUrl && isCoverOpen ? (
        <ImageViewerModal
          src={coverUrl}
          alt={title}
          isOpen
          onClose={() => setIsCoverOpen(false)}
        />
      ) : null}
    </>
  );
}

export default memo(ExpandCard);
