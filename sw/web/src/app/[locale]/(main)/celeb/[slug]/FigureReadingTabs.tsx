/* ─────────────────────────────────────────────
 * [celeb 상세] reading — 읽어보기(인물 안내)
 * - 목차 위치: reading (person-guide)
 * - 데이터: profile.reading prop
 * - 낭독: 사전 생성 MP3, 누락 시 브라우저 음성 + 문장 하이라이트
 * - 함께 보기: detail/CelebRecordSections.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useMemo } from "react";
import { Loader2, Pause, Play, Square, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";

import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import type { Locale } from "@/types/locale";
import { getReadingVoiceUrl } from "@/lib/game/voice/voiceUrl";
import { useReadingNarration } from "@/hooks/useReadingNarration";

// 인물 탐구 닫음(2026-08-22). 안내만 보여준다.
// 생성 품질이 기준에 못 미쳐 화면에서 내렸다. DB의 interpretive_* 필드는 남아 있다.
// 되살릴 때는 celebServiceItems.ts의 person-explore 항목도 함께 푼다.

interface Props {
  reading: CelebBySlugProfile["reading"];
  celebId: string;
  voiceV?: number;
  readingLocale: Locale;
}

/** 문단을 문장 단위로 쪼갠다. 낭독 대기열과 하이라이트가 함께 쓴다 */
function splitSentences(paragraphs: string[]): string[] {
  return paragraphs.flatMap((paragraph) =>
    paragraph
      .split(/(?<=[.!?…])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean),
  );
}

/** A changed source remounts the player, stopping the previous narration. */
export default function FigureReadingTabs(props: Props) {
  return (
    <ReadingPlayer
      key={`${props.celebId}:${props.readingLocale}:${props.voiceV}:${props.reading?.guide}`}
      {...props}
    />
  );
}

function ReadingPlayer({ reading, celebId, voiceV = 0, readingLocale }: Props) {
  const t = useTranslations("celebPage");

  const paragraphs = useMemo(
    () => (reading ? reading.guide.split(/\n\n+/).filter(Boolean) : []),
    [reading],
  );
  /* 문단별 문장 묶음. 낭독 대기열(평면)과 문장 하이라이트(문단)가 함께 쓴다 */
  const paragraphChunks = useMemo(
    () =>
      paragraphs
        .reduce<{ chunks: { start: number; sentences: string[] }[]; next: number }>(
          (acc, paragraph) => {
            const list = splitSentences([paragraph]);
            acc.chunks.push({ start: acc.next, sentences: list });
            return { chunks: acc.chunks, next: acc.next + list.length };
          },
          { chunks: [], next: 0 },
        )
        .chunks,
    [paragraphs],
  );
  const sentences = useMemo(
    () => paragraphChunks.flatMap((chunk) => chunk.sentences),
    [paragraphChunks],
  );

  const { status, activeIndex, play, pause, resume, stop } = useReadingNarration(
    getReadingVoiceUrl(celebId, readingLocale, voiceV),
    sentences,
    readingLocale,
  );

  if (!reading || paragraphs.length === 0) return null;

  /* 브라우저 대체 낭독에만 실제 문장 시작 이벤트로 하이라이트를 붙인다. */
  const renderedParagraphs = paragraphChunks.map((chunk, paragraphIndex) => (
    <p key={paragraphIndex}>
      {chunk.sentences.map((sentence, offset) => {
        const index = chunk.start + offset;
        const isActive = index === activeIndex;
        return (
          <span
            key={offset}
            className={
              isActive ? "rounded-sm bg-accent/15 text-accent" : undefined
            }
          >
            {sentence}{" "}
          </span>
        );
      })}
    </p>
  ));

  return (
    <div>
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-end gap-2">
        {status === "idle" ? (
          <NarrationButton
            label={t("readingPlay")}
            onClick={play}
          >
            <Volume2 size={16} aria-hidden />
          </NarrationButton>
        ) : status === "loading" ? (
          <span className="flex size-9 items-center justify-center text-text-secondary" role="status" aria-label={t("readingPlay")} aria-busy="true">
            <Loader2 size={16} className="animate-spin" aria-hidden />
          </span>
        ) : status === "playing" ? (
          <NarrationButton label={t("readingPause")} onClick={pause}>
            <Pause size={16} aria-hidden />
          </NarrationButton>
        ) : (
          <NarrationButton label={t("readingResume")} onClick={resume}>
            <Play size={16} aria-hidden />
          </NarrationButton>
        )}
        {status !== "idle" ? (
          <NarrationButton label={t("readingStop")} onClick={stop}>
            <Square size={16} aria-hidden />
          </NarrationButton>
        ) : null}
      </div>
      {/* 위아래 여백도 구획 상자가 쥔다. 여기서 겹쳐 주면 글 위아래가 제각각 벌어진다 */}
      <div className="mx-auto max-w-3xl space-y-4 font-serif text-[15px] leading-loose text-text-secondary break-keep md:text-base">
        {renderedParagraphs}
      </div>
    </div>
  );
}

/* 낭독 조작 버튼 — 아이콘 + 접근성 문구 */
function NarrationButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-9 items-center justify-center border border-stone-light bg-bg-card text-text-secondary hover:border-accent hover:text-accent active:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </button>
  );
}
