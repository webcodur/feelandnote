/*
  파일명: /components/features/user/contentLibrary/expand/ContentIntro.tsx
  기능: 펼침 보기 윗칸 — 표지 옆에 붙는 작품 소개.
  책임: 그 작품이 무엇인지만 말한다. 인물의 감상배경은 다음 칸이 맡는다.
        음악은 애플이 소개를 주지 않아 바깥 출처를 여러 곳에서 받아 오고, 둘 이상이면 탭으로 보여 준다.
*/ // ------------------------------
"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";

import FormattedText from "@/components/ui/FormattedText";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { ContentIntroSource } from "@/actions/contents/fetchMusicIntros";
import type { CategoryId } from "@/constants/categories";

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

const BODY_CLASS =
  "whitespace-pre-wrap text-sm leading-relaxed text-text-secondary";

interface ContentIntroProps {
  brief: ContentBrief | null;
  isLoading: boolean;
}

export default function ContentIntro({ brief, isLoading }: ContentIntroProps) {
  const t = useTranslations("archiveSearch");
  const headingId = useId();
  const [pickedProvider, setPickedProvider] = useState<ContentIntroSource["provider"] | null>(null);

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

  // 바깥에서 받아 온 소개들. 앞선 작품에서 고른 탭이 남아 있으면 첫 번째로 되돌린다
  const sources = brief?.introSources ?? [];
  const active = sources.find((item) => item.provider === pickedProvider) ?? sources[0] ?? null;

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
        <div className={BODY_CLASS}>
          <FormattedText text={text} />
        </div>
      ) : active ? (
        <div>
          {sources.length > 1 && (
            <div role="tablist" className="mb-3 flex gap-1.5">
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

          <div className={BODY_CLASS}>
            <FormattedText text={normalizeContentIntroText(active.text)} />
          </div>

          {active.url && (
            <a
              href={active.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-text-tertiary underline-offset-2 hover:text-accent hover:underline"
            >
              {t("expandIntroSource", { source: PROVIDER_LABEL[active.provider] })}
            </a>
          )}
        </div>
      ) : (
        <p className="text-sm italic text-text-tertiary">{t("expandNoIntro")}</p>
      )}
    </section>
  );
}
