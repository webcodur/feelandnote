/* ─────────────────────────────────────────────
 * [celeb 상세] reading — 읽어보기(인물 안내)
 * - 목차 위치: reading (person-guide)
 * - 데이터: profile.reading prop
 * - 낭독: 브라우저 기본 음성(speechSynthesis), 문장 단위 하이라이트
 * - 함께 보기: detail/CelebRecordSections.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";

// 인물 탐구 닫음(2026-08-22). 안내만 보여준다.
// 생성 품질이 기준에 못 미쳐 화면에서 내렸다. DB의 interpretive_* 필드는 남아 있다.
// 되살릴 때는 celebServiceItems.ts의 person-explore 항목도 함께 푼다.

type NarrationStatus = "idle" | "playing" | "paused";

interface Props {
  reading: CelebBySlugProfile["reading"];
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

/** 브라우저 낭독(speechSynthesis) 지원 여부. 서버는 false로 고정해 물차이를 막는다 */
const subscribeNoop = () => () => {};
const getSpeechSupport = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;
const getSpeechSupportServer = () => false;

export default function FigureReadingTabs({ reading }: Props) {
  const t = useTranslations("celebPage");
  const locale = useLocale();

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

  const supported = useSyncExternalStore(
    subscribeNoop,
    getSpeechSupport,
    getSpeechSupportServer,
  );
  const [status, setStatus] = useState<NarrationStatus>("idle");
  const [activeIndex, setActiveIndex] = useState(-1);

  const generationRef = useRef(0);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const sentencesRef = useRef(sentences);

  useEffect(() => {
    sentencesRef.current = sentences;
  }, [sentences]);

  /* ── 1. 화면 언어에 맞는 목소리를 고른다. 목록은 늦게 도착할 수 있다 ── */
  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const pick = () => {
      const prefix = locale === "en" ? "en" : "ko";
      const voices = synth.getVoices();
      voiceRef.current =
        voices.find((voice) => voice.lang.toLowerCase().replace("_", "-").startsWith(prefix)) ??
        null;
    };
    pick();
    synth.addEventListener("voiceschanged", pick);
    return () => synth.removeEventListener("voiceschanged", pick);
  }, [locale, supported]);

  /* ── 2. 자원 정리 — 화면을 벗어나면 낭독을 끝낸다 ── */
  useEffect(() => {
    return () => {
      generationRef.current += 1;
      window.speechSynthesis?.cancel();
    };
  }, []);

  /* ── 3. 크롬 장기 발화 끊김 방지 — 주기적으로 이어준다 ── */
  useEffect(() => {
    if (status !== "playing") return;
    const timer = window.setInterval(() => {
      const synth = window.speechSynthesis;
      if (synth.speaking && !synth.paused) {
        synth.pause();
        synth.resume();
      }
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [status]);

  const reset = useCallback(() => {
    setStatus("idle");
    setActiveIndex(-1);
  }, []);

  const speakFrom = useCallback((start: number) => {
    const synth = window.speechSynthesis;
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    synth.cancel();

    const speakAt = (index: number) => {
      const list = sentencesRef.current;
      if (generation !== generationRef.current) return;
      if (index >= list.length) {
        reset();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(list[index]);
      // 영문 화면에 한국어 원문 폴백이 노출될 수 있다. 문장의 글자로 언어를 판정한다
      const hasHangul = /[가-힣]/.test(list[index]);
      utterance.lang = hasHangul ? "ko-KR" : locale === "en" ? "en-US" : "ko-KR";
      const voice = voiceRef.current;
      if (voice && (hasHangul ? voice.lang.toLowerCase().startsWith("ko") : true)) {
        utterance.voice = voice;
      }
      utterance.onstart = () => {
        if (generation !== generationRef.current) return;
        setActiveIndex(index);
        setStatus("playing");
      };
      utterance.onend = () => speakAt(index + 1);
      utterance.onerror = () => {
        if (generation !== generationRef.current) return;
        reset();
      };
      synth.speak(utterance);
    };

    setStatus("playing");
    speakAt(start);
  }, [locale, reset]);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setStatus("playing");
  }, []);

  const stop = useCallback(() => {
    generationRef.current += 1;
    window.speechSynthesis.cancel();
    reset();
  }, [reset]);

  if (!reading || paragraphs.length === 0) return null;

  /* ── 4. 문장 렌더 — 낭독 중인 문장을 짚어 보여준다 ── */
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
      {/* 브라우저 낭독(speechSynthesis) 조작 — 2026-09-07 임시 비활성. 되살리려면 이 주석만 푼다.
      {supported ? (
        <div className="mx-auto mb-4 flex max-w-3xl items-center justify-end gap-2">
          {status === "idle" ? (
            <NarrationButton
              label={t("readingPlay")}
              onClick={() => speakFrom(0)}
            >
              <Volume2 size={16} aria-hidden />
            </NarrationButton>
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
      ) : null}
      */}
      {/* 위아래 여백도 구획 상자가 쥔다. 여기서 겹쳐 주면 글 위아래가 제각각 벌어진다 */}
      <div className="mx-auto max-w-3xl space-y-4 font-serif text-[15px] leading-loose text-text-secondary break-keep md:text-base">
        {renderedParagraphs}
      </div>
    </div>
  );
}

/* ── 5. 낭독 조작 버튼 — 아이콘 + 접근성 문구 ── */
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
