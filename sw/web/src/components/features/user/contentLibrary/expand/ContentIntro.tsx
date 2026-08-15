/*
  파일명: /components/features/user/contentLibrary/expand/ContentIntro.tsx
  기능: 펼침 보기 윗칸 — 표지 옆에 붙는 작품 소개.
  책임: 그 작품이 무엇인지만 말한다. 인물의 감상배경은 다음 칸이 맡는다.
*/ // ------------------------------
"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";

import FormattedText from "@/components/ui/FormattedText";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { CategoryId } from "@/constants/categories";

import { normalizeContentIntroText, selectContentIntroText } from "./contentIntroText";
import { EXPAND_SECTION_HEADING_CLASS } from "./expandSectionStyles";
import { useWheelBoundaryPassThrough } from "./useWheelBoundaryPassThrough";

// 매체마다 제목을 달리 붙인다 — 영화를 "작품 소개"라 부르면 무엇의 소개인지 흐려진다
const INTRO_HEADING_KEY: Record<CategoryId, string> = {
  all: "expandContentIntro",
  book: "expandBookIntro",
  video: "expandVideoIntro",
  game: "expandGameIntro",
  music: "expandMusicIntro",
};

interface ContentIntroProps {
  brief: ContentBrief | null;
  isLoading: boolean;
}

export default function ContentIntro({ brief, isLoading }: ContentIntroProps) {
  const t = useTranslations("archiveSearch");
  const headingId = useId();
  const scrollRef = useWheelBoundaryPassThrough();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.06]" />
      </div>
    );
  }

  const sourceText = selectContentIntroText(brief);
  const text = sourceText ? normalizeContentIntroText(sourceText) : null;

  return (
    <section aria-labelledby={headingId}>
      <h4
        id={headingId}
        className={`${EXPAND_SECTION_HEADING_CLASS} mb-4`}
      >
        {t(INTRO_HEADING_KEY[brief?.category ?? "all"])}
      </h4>

      {/* 영상 홍보 문구는 소개 위에 한 줄로 얹는다 */}
      {brief?.category === "video" && brief.metadata?.tagline && (
        <p className="mb-3 text-sm italic text-text-secondary">{brief.metadata.tagline}</p>
      )}

      {text ? (
        <div
          ref={scrollRef}
          className="custom-scrollbar max-h-56 overflow-y-auto whitespace-pre-wrap pe-2 text-sm leading-relaxed text-text-secondary sm:max-h-72"
        >
          <FormattedText text={text} />
        </div>
      ) : (
        <p className="text-sm italic text-text-tertiary">{t("expandNoIntro")}</p>
      )}
    </section>
  );
}
