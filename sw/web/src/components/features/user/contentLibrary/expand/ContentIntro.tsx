/*
  파일명: /components/features/user/contentLibrary/expand/ContentIntro.tsx
  기능: 펼침 보기 윗칸 — 표지 옆에 붙는 작품 소개.
  책임: 그 작품이 무엇인지만 말한다. 인물의 감상배경은 다음 칸이 맡는다.
        넓은 화면은 표지 열이 주는 높이만큼 채우고, 모바일은 여덟 줄에서 접는다. 넘친 글은 모달로 마저 본다.
        음악은 애플이 소개를 주지 않아 바깥 출처를 여러 곳에서 받아 오고, 둘 이상이면 탭으로 보여 준다.
*/ // ------------------------------
"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";

import ContentReadingText from "@/components/ui/ContentReadingText";
import ContentTextModal, { ExpandTextButton } from "@/components/ui/ContentTextModal";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { ContentIntroSource } from "@/actions/contents/fetchMusicIntros";
import { getCategoryById, type CategoryId } from "@/constants/categories";
import { useClippedText } from "@/hooks/useClippedText";

import { normalizeContentIntroText, selectContentIntroText } from "./contentIntroText";
import { EXPAND_SECTION_HEADING_CLASS } from "./expandSectionStyles";

// 매체마다 제목을 달리 붙인다 — 영화를 "작품 소개"라 부르면 무엇의 소개인지 흐려진다
const INTRO_HEADING_KEY: Record<CategoryId, string> = {
  all: "expandContentIntro",
  book: "expandBookIntro",
  video: "expandVideoIntro",
  game: "expandGameIntro",
  music: "expandMusicIntro",
};

// 출처 이름은 고유명사라 번역하지 않는다
const PROVIDER_LABEL: Record<ContentIntroSource["provider"], string> = {
  wikipedia: "Wikipedia",
  lastfm: "Last.fm",
};

/* 줄 수를 미리 박지 않는다. 넓은 화면은 칸이 주는 높이(표지 열, ExpandCard가 정한다)만큼 채우고
   나머지를 자른다. 모바일은 표지 아래로 쌓여 기준 높이가 없으므로 여덟 줄에서 접는다. 조합은 useClippedText 참고 */
const INTRO_BODY_CLASS = "max-sm:line-clamp-8 sm:min-h-0 sm:flex-1 sm:overflow-hidden";
/* 넓은 화면에서 잘린 글은 끝을 흐린다. 모바일은 말줄임표가 그 일을 한다 */
const INTRO_CLIPPED_CLASS = "sm:clip-fade-end";

interface ContentIntroProps {
  brief: ContentBrief | null;
  category: CategoryId;
  isLoading: boolean;
}

export default function ContentIntro({ brief, category, isLoading }: ContentIntroProps) {
  const t = useTranslations("archiveSearch");
  const headingId = useId();
  const [pickedProvider, setPickedProvider] = useState<ContentIntroSource["provider"] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sourceText = selectContentIntroText(brief);
  const text = sourceText ? normalizeContentIntroText(sourceText) : null;
  const headingCategory = brief?.category ?? category;
  // 아래 감상배경 제목에 인물 사진이 붙듯, 소개 제목에는 같은 규격의 매체 아이콘 배지를 붙인다
  const CategoryIcon = getCategoryById(headingCategory)?.lucideIcon;

  // 바깥에서 받아 온 소개들. 앞선 작품에서 고른 탭이 남아 있으면 첫 번째로 되돌린다
  const sources = brief?.introSources ?? [];
  const active = sources.find((item) => item.provider === pickedProvider) ?? sources[0] ?? null;
  const activeText = active ? normalizeContentIntroText(active.text) : null;
  const fullText = text ?? activeText;

  // 본문이 없거나 로딩 중이면 직전 카드의 측정값이 남을 수 있어 본문 유무로 한 번 더 가른다
  const { ref: bodyRef, isClipped: isBodyClipped } = useClippedText(fullText, !isLoading);
  const isClipped = !isLoading && !!fullText && isBodyClipped;
  const bodyClass = isClipped ? `${INTRO_BODY_CLASS} ${INTRO_CLIPPED_CLASS}` : INTRO_BODY_CLASS;

  return (
    <section aria-labelledby={headingId} className="flex flex-col sm:h-full">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {CategoryIcon && (
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-bg-secondary text-accent"
            >
              <CategoryIcon size={18} />
            </span>
          )}
          <h4 id={headingId} className={EXPAND_SECTION_HEADING_CLASS}>
            {t(INTRO_HEADING_KEY[headingCategory])}
          </h4>
        </div>
        {isClipped && (
          <ExpandTextButton label={t("expandIntroMore")} onClick={() => setIsModalOpen(true)} />
        )}
      </div>

      {/* 영상 홍보 문구는 소개 위에 한 줄로 얹는다 */}
      {!isLoading && brief?.category === "video" && brief.metadata?.tagline && (
        <p className="mb-3 shrink-0 text-sm italic text-text-secondary">{brief.metadata.tagline}</p>
      )}

      {isLoading ? (
        <div aria-hidden className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
          <div className="h-3 w-11/12 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.06]" />
        </div>
      ) : text ? (
        <ContentReadingText ref={bodyRef} text={text} tone="secondary" size="compact" className={bodyClass} />
      ) : active ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {sources.length > 1 && (
            <div role="tablist" className="mb-3 flex shrink-0 gap-1.5">
              {sources.map((item) => {
                const isActive = item.provider === active.provider;
                return (
                  <button
                    key={item.provider}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setPickedProvider(item.provider)}
                    className={`rounded-md border px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
                      isActive
                        ? "border-accent/50 bg-accent/15 text-white"
                        : "border-white/10 bg-white/[0.03] text-text-tertiary hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {PROVIDER_LABEL[item.provider]}
                  </button>
                );
              })}
            </div>
          )}

          <ContentReadingText ref={bodyRef} text={activeText} tone="secondary" size="compact" className={bodyClass} />

          {active.url && (
            <a
              href={active.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block shrink-0 self-start text-xs text-text-tertiary underline-offset-2 hover:text-accent hover:underline"
            >
              {t("expandIntroSource", { source: PROVIDER_LABEL[active.provider] })}
            </a>
          )}
        </div>
      ) : (
        <p className="text-sm italic text-text-tertiary">{t("expandNoIntro")}</p>
      )}

      {isModalOpen && fullText ? (
        <ContentTextModal
          isOpen
          onClose={() => setIsModalOpen(false)}
          title={t(INTRO_HEADING_KEY[headingCategory])}
          text={fullText}
          source={
            active?.url
              ? {
                  href: active.url,
                  label: t("expandIntroSource", { source: PROVIDER_LABEL[active.provider] }),
                }
              : undefined
          }
        />
      ) : null}
    </section>
  );
}
