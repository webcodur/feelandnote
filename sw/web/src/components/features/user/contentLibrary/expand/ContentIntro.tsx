/*
  파일명: /components/features/user/contentLibrary/expand/ContentIntro.tsx
  기능: 펼침 보기 윗칸 — 표지 옆에 붙는 작품 소개.
  책임: 그 작품이 무엇인지만 말한다. 인물의 감상배경은 다음 칸이 맡는다.
        넓은 화면은 표지 열이 주는 높이만큼 채우고, 모바일은 표지·구매 버튼을 감싸 흐른 뒤 접는다. 넘친 글은 모달로 마저 본다.
        음악은 애플이 소개를 주지 않아 바깥 출처를 여러 곳에서 받아 오고, 둘 이상이면 탭으로 보여 준다.
*/ // ------------------------------
"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";

import ContentReadingText from "@/components/ui/ContentReadingText";
import FormattedText from "@/components/ui/FormattedText";
import { INTRO_PROVIDER_HEADING_NAME } from "@/components/shared/BookIntroductionSource";
import ContentTextModal from "@/components/ui/ContentTextModal";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { ContentIntroSource } from "@/actions/contents/fetchMusicIntros";
import { getCategoryById, type CategoryId } from "@/constants/categories";
import { useClippedText } from "@/hooks/useClippedText";

import { normalizeContentIntroText, selectContentIntroText } from "./contentIntroText";
import { EXPAND_SECTION_HEADING_CLASS } from "./expandSectionStyles";

// 매체마다 제목을 달리 붙인다 — 영화를 "작품 소개"라 부르면 무엇의 소개인지 흐려진다
export const INTRO_HEADING_KEY: Record<CategoryId, string> = {
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
   나머지를 자른다. 모바일은 표지·구매 버튼 아래로 본문이 이어지는 여유를 둔다. overflow-clip은 float를 막는 별도 서식 영역을 만들지 않는다. */
const INTRO_BODY_CLASS = "overflow-clip max-sm:max-h-[calc(var(--intro-media-height,198px)+5lh)] sm:min-h-0 sm:flex-1";
/* PC·모바일 모두 잘린 글은 말줄임표 대신 아래쪽을 서서히 흐린다 */
const INTRO_CLIPPED_CLASS = "clip-fade-end";

interface ContentIntroProps {
  brief: ContentBrief | null;
  category: CategoryId;
  isLoading: boolean;
}

export default function ContentIntro({ brief, category, isLoading }: ContentIntroProps) {
  const t = useTranslations("archiveSearch");
  const locale = useLocale();
  const headingId = useId();
  const [pickedProvider, setPickedProvider] = useState<ContentIntroSource["provider"] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sourceText = selectContentIntroText(brief);
  const text = sourceText ? normalizeContentIntroText(sourceText) : null;
  const headingCategory = brief?.category ?? category;
  const IntroIcon = getCategoryById(headingCategory)?.lucideIcon ?? BookOpen;
  const inlineIcon = (
    <span data-intro-inline-marker aria-hidden className="me-1.5 inline-block align-[-0.15em] text-accent sm:hidden">
      <IntroIcon size={18} />
    </span>
  );
  // 책 소개는 출처를 제목에 합쳐 「다음 책 소개」처럼 한 덩어리로 읽는다
  const provider = headingCategory === "book" ? brief?.introductionAttribution?.provider : undefined;
  const providerName =
    !isLoading && provider
      ? INTRO_PROVIDER_HEADING_NAME[provider]?.[locale === "en" ? "en" : "ko"]
      : null;
  const headingText = providerName
    ? t("expandBookIntroFrom", { source: providerName })
    : t(INTRO_HEADING_KEY[headingCategory]);

  // 바깥에서 받아 온 소개들. 앞선 작품에서 고른 탭이 남아 있으면 첫 번째로 되돌린다
  const sources = brief?.introSources ?? [];
  const active = sources.find((item) => item.provider === pickedProvider) ?? sources[0] ?? null;
  const activeText = active ? normalizeContentIntroText(active.text) : null;
  const fullText = text ?? activeText;

  // 본문이 없거나 로딩 중이면 직전 카드의 측정값이 남을 수 있어 본문 유무로 한 번 더 가른다
  const { ref: bodyRef, isClipped: isBodyClipped } = useClippedText(fullText, !isLoading);
  const isClipped = !isLoading && !!fullText && isBodyClipped;
  const bodyClass = isClipped ? `${INTRO_BODY_CLASS} ${INTRO_CLIPPED_CLASS}` : INTRO_BODY_CLASS;
  // 짧아 다 보이는 글도 눌러 모달로 읽는다 — 모달은 잘린 글의 더보기가 아니라 다른 읽기 화면이다
  const openModal = () => setIsModalOpen(true);
  // 책은 보존된 소개 출처로, 음악은 지금 고른 바깥 소개로 나간다
  const modalSourceUrl = brief?.introductionAttribution?.url ?? active?.url ?? null;

  return (
    <section aria-labelledby={headingId} className="sm:flex sm:h-full sm:flex-col">
      <h4 id={headingId} className={`${EXPAND_SECTION_HEADING_CLASS} mb-4 hidden shrink-0 text-center sm:block`}>
        {providerName ? (
          <>
            {/* 출처는 칩이 아니라 색만 다른 글자로 — 「다음 책 소개」처럼 한 덩어리로 읽는다 */}
            <span className="text-accent">{providerName}</span> {t("expandBookIntro")}
          </>
        ) : (
          headingText
        )}
      </h4>

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
        <ContentReadingText
          ref={bodyRef}
          text={text}
          tone="secondary"
          size="compact"
          className={bodyClass}
          onClick={openModal}
          clickLabel={t("expandIntroMore")}
        >
          {inlineIcon}<FormattedText text={text} />
        </ContentReadingText>
      ) : active ? (
        <div className="sm:flex sm:min-h-0 sm:flex-1 sm:flex-col">
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

          <ContentReadingText
            ref={bodyRef}
            text={activeText}
            tone="secondary"
            size="compact"
            className={bodyClass}
            onClick={openModal}
            clickLabel={t("expandIntroMore")}
          >
            {inlineIcon}<FormattedText text={activeText} />
          </ContentReadingText>

          {active.url && (
            <a
              href={active.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block shrink-0 self-center text-xs text-text-tertiary underline-offset-2 hover:text-accent hover:underline"
            >
              {t("expandIntroSource")}
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
          title={headingText}
          text={fullText}
          source={
            modalSourceUrl
              ? { href: modalSourceUrl, label: t("expandIntroSource") }
              : undefined
          }
        />
      ) : null}
    </section>
  );
}
