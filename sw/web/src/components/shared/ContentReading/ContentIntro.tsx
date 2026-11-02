/*
  파일명: /components/shared/ContentReading/ContentIntro.tsx
  기능: 펼침 보기 윗칸 — 표지 옆에 붙는 작품 소개.
  책임: 그 작품이 무엇인지만 말한다. 인물의 감상배경은 다음 칸이 맡는다.
        상한(INLINE_READING_TEXT_MAX) 안의 소개는 통째로 보인다. 상한을 넘는 장문만
        넓은 화면은 표지 열 높이에 맞춰 자르고, 모바일은 표지·구매 버튼을 감싸 흐른 뒤 접는다 — 넘친 글은 모달로 마저 본다.
        음악은 애플이 소개를 주지 않아 바깥 출처를 여러 곳에서 받아 오고, 둘 이상이면 탭으로 보여 준다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import ClippedContentReadingText from "@/components/ui/ClippedContentReadingText";
import ContentReadingText from "@/components/ui/ContentReadingText";
import ContentReadingBody from "./ContentReadingBody";
import { fitsInlineReadingText } from "@/constants/readingText";

import ContentTextModal from "@/components/ui/ContentTextModal";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { ContentIntroSource } from "@/actions/contents/fetchMusicIntros";
import type { CategoryId } from "@/constants/categories";

import { resolveContentIntroduction } from "./contentReadingData";

// 출처 이름은 고유명사라 번역하지 않는다
const PROVIDER_LABEL: Record<ContentIntroSource["provider"], string> = {
  wikipedia: "Wikipedia",
  lastfm: "Last.fm",
};

/* 줄 수를 미리 박지 않는다. 넓은 화면은 칸이 주는 높이(표지 열, ExpandCard가 정한다)만큼 채우고
   나머지를 자른다. 모바일은 표지·구매 버튼 아래로 본문이 이어지는 여유를 둔다. overflow-clip은 float를 막는 별도 서식 영역을 만들지 않는다. */
const INTRO_BODY_CLASS = "overflow-clip max-sm:max-h-[calc(var(--intro-media-height,198px)+5lh)] sm:min-h-0 sm:flex-1";

interface ContentIntroProps {
  brief: ContentBrief | null;
  category: CategoryId;
  isLoading: boolean;
  expanded?: boolean;
  textLayout?: "inline" | "prose";
  mode?: "inline" | "modal";
}

export default function ContentIntro({ brief, category, isLoading, expanded = false, textLayout, mode = "inline" }: ContentIntroProps) {
  const t = useTranslations("archiveSearch");
  const locale = useLocale();

  const [pickedProvider, setPickedProvider] = useState<ContentIntroSource["provider"] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const headingText = t("expandContentIntro");
  const tone = "intro";
  const sources = brief?.introSources ?? [];
  const active = sources.find((item) => item.provider === pickedProvider) ?? sources[0] ?? null;
  const { text: fullText, sourceUrl: modalSourceUrl } = resolveContentIntroduction(brief, pickedProvider);
  const readingBody = fullText ? <ContentReadingBody kind="intro" label={headingText} text={fullText}
    sourceUrl={modalSourceUrl} textLayout={textLayout} /> : null;
  // 상한 안이면 통째로 싣고 잘림·모달 조작을 아예 두지 않는다 — 넘는 장문만 접는다
  const fitsInline = expanded || fitsInlineReadingText(fullText, locale);

  // 장문 미리보기 또는 명시적인 소개 버튼에서 전문을 연다
  const openModal = () => setIsModalOpen(true);
  const introductionModal = isModalOpen && fullText && (
    <ContentTextModal
      isOpen
      onClose={() => setIsModalOpen(false)}
      title={headingText}
      readingLabel={headingText}
      text={fullText}
      tone={tone}
      source={modalSourceUrl ? { href: modalSourceUrl, label: t("expandIntroSource") } : undefined}
    />
  );

  if (mode === "modal") return (
    <div className="flex justify-center" aria-busy={isLoading || undefined}>
      <button
        type="button"
        onClick={openModal}
        disabled={isLoading || !fullText}
        aria-haspopup="dialog"
        aria-expanded={isModalOpen}
        title={!isLoading && !fullText ? t("expandNoIntro") : undefined}
        className="inline-flex min-h-11 items-center justify-center rounded-control px-3 text-sm font-semibold text-text-secondary hover:bg-accent/10 hover:text-accent active:bg-accent/15 disabled:cursor-default disabled:text-text-tertiary disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        [{t("expandContentIntro")}]
      </button>
      {introductionModal}
    </div>
  );

  return (
    <section data-content-category={brief?.category ?? category} aria-label={headingText} className="sm:flex sm:h-full sm:flex-col">
      {/* 영상 홍보 문구는 소개 위에 한 줄로 얹는다 */}
      {!isLoading && brief?.category === "video" && brief.metadata?.tagline && (
        <p className="mb-3 shrink-0 text-sm italic text-text-secondary">{brief.metadata.tagline}</p>
      )}

      {!isLoading && !brief?.description && sources.length > 1 && <div role="tablist" className="mb-3 flex shrink-0 gap-1.5">
        {sources.map(item => <button key={item.provider} type="button" role="tab" aria-selected={item.provider === active?.provider}
          onClick={() => setPickedProvider(item.provider)} className={`rounded-md border px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${item.provider === active?.provider ? "border-accent/50 bg-accent/15 text-white" : "border-white/10 bg-white/[0.03] text-text-tertiary hover:border-white/25 hover:text-white"}`}>
          {PROVIDER_LABEL[item.provider]}
        </button>)}
      </div>}

      {isLoading ? (
        <div aria-hidden className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
          <div className="h-3 w-11/12 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.06]" />
        </div>
      ) : fullText ? (
        <div className="sm:flex sm:min-h-0 sm:flex-1 sm:flex-col">
          {fitsInline ? (
            <ContentReadingText text={fullText} tone={tone} size="compact">
              {readingBody}
            </ContentReadingText>
          ) : (
            <ClippedContentReadingText
              text={fullText}
              tone={tone}
              size="compact"
              className={INTRO_BODY_CLASS}
              onClick={openModal}
              clickLabel={t("expandIntroMore")}
            >
              {readingBody}
            </ClippedContentReadingText>
          )}
        </div>
      ) : (
        <p className="text-sm italic text-text-tertiary">{t("expandNoIntro")}</p>
      )}
      {introductionModal}
    </section>
  );
}
