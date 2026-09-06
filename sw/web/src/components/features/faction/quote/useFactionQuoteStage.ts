/*
  파일명: /components/features/faction/quote/useFactionQuoteStage.ts
  기능: 화보 위 인물 대사 재생 상태
  책임: 음성이 있으면 발화에 맞춰 자막·화보를 넘기고, 없으면 사람이 눌러 넘길 장을 관리한다.
*/ // ------------------------------

"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { FactionQuoteMedia } from "@feelandnote/shared/lib/faction-quote-media";
import { duckBgm } from "@/lib/audio-ducking";
import {
  CAPTION_TRANSITION_LEAD_SEC,
  PORTRAIT_TRANSITION_LEAD_SEC,
  buildQuotePages,
} from "./factionQuotePaging";

interface StagePortrait {
  /** 음성 재생 시작 기준 초 */
  at: number;
}

interface UseFactionQuoteStageInput {
  /** 이 인물이 하는 말. 없으면 재생할 것이 없다 */
  quote: string | null;
  /** 출간된 음성·화보 전환 묶음. 없으면 손으로 넘긴다 */
  media: FactionQuoteMedia | null;
  locale: "ko" | "en";
  /** 화면에 실제로 걸린 화보들 — 발화 시각에 맞춰 넘길 대상이다 */
  portraits: StagePortrait[];
}

export interface FactionQuoteStage {
  /** 대사가 화면에 떠 있는지 */
  isVisible: boolean;
  /** 목소리 없이 손으로 넘기는 중인지 */
  isManual: boolean;
  manualStepIndex: number;
  isLastManualStep: boolean;
  /** 손으로 넘길 장 목록 */
  steps: { text: string; at: number }[];
  /** 지금 띄울 글. 없으면 아무것도 그리지 않는다 */
  visibleQuote: string | null;
  activeCaptionIndex: number;
  portraitIndex: number;
  /** 이 화면에서 음성을 재생할 수 있는지(다른 locale 음성은 재생하지 않는다) */
  hasPlayableAudio: boolean;
  /** 재생·정지를 오간다 */
  toggle: () => void;
  stop: () => void;
  /** 손으로 다음 장으로 넘긴다 */
  advance: () => void;
  /** 화보를 손으로 넘길 때 재생을 멈추고 자리를 옮긴다 */
  movePortrait: (index: number) => void;
  /** 화보를 눌렀을 때 — 단추·링크 위 클릭은 흘려보낸다 */
  handleSurfaceClick: (event: MouseEvent<HTMLElement>) => void;
}

/**
 * 화보 한 장 안에서 대사를 재생한다. 전역 대사창을 거치지 않는다.
 *
 * 대사가 화면에 뜨지 않으면 재생 단추가 아무 일도 안 한 것처럼 보인다.
 * 음성이 붙은 인물은 소수고 나머지는 글자밖에 없다 — 자막을 끄면 그 인물들은 눌러도
 * 화면이 그대로다. 그래서 자막은 항상 띄우고, 음성이 있으면 발화에 맞춰,
 * 없으면 대사를 장으로 나눠 사람이 넘긴다.
 */
export function useFactionQuoteStage({ quote, media, locale, portraits }: UseFactionQuoteStageInput): FactionQuoteStage {
  const [isVisible, setIsVisible] = useState(false);
  const [portraitIndex, setPortraitIndex] = useState(0);
  const portraitIndexRef = useRef(0);
  const [activeCaptionIndex, setActiveCaptionIndex] = useState(-1);
  const activeCaptionIndexRef = useRef(-1);
  /** 목소리 없는 인물의 말을 몇 번째 문장까지 넘겼는지. -1 이면 넘기는 중이 아니다 */
  const [manualStepIndex, setManualStepIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const duckRestoreRef = useRef<(() => void) | null>(null);

  const stop = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    audioRef.current?.pause();
    audioRef.current = null;
    portraitIndexRef.current = 0;
    activeCaptionIndexRef.current = -1;
    setPortraitIndex(0);
    setActiveCaptionIndex(-1);
    setManualStepIndex(-1);
    setIsVisible(false);
    // 대사 끝 — BGM 원음 복원
    duckRestoreRef.current?.();
    duckRestoreRef.current = null;
  };

  useEffect(() => () => {
    audioRef.current?.pause();
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  const hasPlayableAudio = Boolean(media?.audioUrl && media.locale === locale);
  // 배포 직후 서버 캐시에 남은 구형 재생 묶음에는 captions 키가 없을 수 있다.
  const captions = media?.locale === locale ? media.captions ?? [] : [];

  const setPortraitForTime = (seconds: number) => {
    if (!portraits.length) return;
    let next = 0;
    for (let i = 0; i < portraits.length; i += 1) {
      if (portraits[i].at <= seconds + PORTRAIT_TRANSITION_LEAD_SEC) next = i;
      else break;
    }
    if (next === portraitIndexRef.current) return;
    portraitIndexRef.current = next;
    setPortraitIndex(next);
  };

  const setCaptionForTime = (seconds: number) => {
    if (!captions.length) return;
    let next = -1;
    for (let i = 0; i < captions.length; i += 1) {
      if (captions[i].at <= seconds + CAPTION_TRANSITION_LEAD_SEC) next = i;
      else break;
    }
    if (next === activeCaptionIndexRef.current) return;
    activeCaptionIndexRef.current = next;
    setActiveCaptionIndex(next);
  };

  /*
    손으로 넘길 장. 영상 자막 조각은 절대 쓰지 않는다 — 그 조각은 말소리에 맞춰 자막을
    넘기려고 자른 것이라("모델의 지능은" / "데이터의 양이 아니라" / "질에서 나온다")
    소리가 없으면 토막글을 다섯 번 누르게 만든다. 읽으라고 내놓는 장은 말 전문에서 다시 나눈다.
    화보 전환 시각은 그 장이 시작되는 자막 조각에서 빌려 온다.
  */
  const steps: { text: string; at: number }[] = quote
    ? (() => {
        let searchFrom = 0;
        return buildQuotePages(quote).map((text) => {
          const hit = captions.findIndex(
            (caption, i) => i >= searchFrom && text.includes(caption.text.trim())
          );
          if (hit >= 0) searchFrom = hit + 1;
          return { text, at: hit >= 0 ? captions[hit].at : 0 };
        });
      })()
    : [];
  const isManual = manualStepIndex >= 0;
  const isLastManualStep = isManual && manualStepIndex >= steps.length - 1;

  const visibleQuote = isManual
    ? steps[manualStepIndex]?.text ?? null
    : captions.length
      ? (activeCaptionIndex >= 0 ? captions[activeCaptionIndex]?.text ?? null : null)
      : quote;

  const toggle = () => {
    if (!quote) return;
    if (isVisible) {
      stop();
      return;
    }

    const playableMedia = media?.audioUrl && media.locale === locale ? media : null;
    const audioUrl = playableMedia?.audioUrl;
    portraitIndexRef.current = 0;
    activeCaptionIndexRef.current = -1;
    setPortraitIndex(0);
    setActiveCaptionIndex(-1);
    setIsVisible(true);
    setPortraitForTime(0);
    setCaptionForTime(0);

    /*
      목소리가 없으면 저절로 흘러가지 않는다 — 첫 문장만 띄우고 다음은 사람이 눌러 넘긴다.
      읽는 속도가 사람마다 달라 시간을 정해 두면 누구에게는 너무 빠르고 누구에게는 답답하다.
    */
    const startManualPaging = () => {
      setManualStepIndex(0);
      setPortraitForTime(steps[0]?.at ?? 0);
    };

    if (!playableMedia || !audioUrl) {
      startManualPaging();
      return;
    }

    // BGM 덕킹 — 대사 재생 직전 30%로 낮춘다
    duckRestoreRef.current?.();
    duckRestoreRef.current = duckBgm();

    const audio = new Audio(audioUrl);
    audio.volume = 0.7;
    audio.playbackRate = playableMedia.playbackRate || 1;
    audioRef.current = audio;

    const syncPortrait = () => {
      if (audioRef.current !== audio || audio.paused) return;
      const playbackSeconds = audio.currentTime / Math.max(audio.playbackRate, 0.01);
      setPortraitForTime(playbackSeconds);
      setCaptionForTime(playbackSeconds);
      rafRef.current = requestAnimationFrame(syncPortrait);
    };

    audio.addEventListener("ended", stop, { once: true });
    audio.addEventListener("error", () => {
      if (audioRef.current !== audio) return;
      audioRef.current = null;
      duckRestoreRef.current?.();
      duckRestoreRef.current = null;
      startManualPaging();
    }, { once: true });
    void audio.play().then(() => {
      if (audioRef.current !== audio) return;
      setPortraitForTime(0);
      setCaptionForTime(0);
      rafRef.current = requestAnimationFrame(syncPortrait);
    }).catch(() => {
      if (audioRef.current !== audio) return;
      audioRef.current = null;
      duckRestoreRef.current?.();
      duckRestoreRef.current = null;
      startManualPaging();
    });
  };

  /** 목소리 없는 말을 한 문장씩 넘긴다. 마지막에서 한 번 더 누르면 닫힌다. */
  const advance = () => {
    const next = manualStepIndex + 1;
    if (next >= steps.length) {
      stop();
      return;
    }
    setManualStepIndex(next);
    setPortraitForTime(steps[next].at);
  };

  const movePortrait = (index: number) => {
    stop();
    portraitIndexRef.current = index;
    setPortraitIndex(index);
  };

  const handleSurfaceClick = (event: MouseEvent<HTMLElement>) => {
    if (!quote) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("button, a")) return;
    if (isManual) {
      advance();
      return;
    }
    toggle();
  };

  return {
    isVisible,
    isManual,
    manualStepIndex,
    isLastManualStep,
    steps,
    visibleQuote,
    activeCaptionIndex,
    portraitIndex,
    hasPlayableAudio,
    toggle,
    stop,
    advance,
    movePortrait,
    handleSurfaceClick,
  };
}
