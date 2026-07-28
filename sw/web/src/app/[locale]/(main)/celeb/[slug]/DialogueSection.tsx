"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Play, Square, ListMusic } from "lucide-react";
import type { Locale } from "@/types/locale";
import { stripEmotionTag } from "@/components/features/game/shared/hooks/useDialogue";
import { getVoiceUrl, getQuoteVoiceUrl, getMonologueVoiceUrl } from "@/lib/game/voice/voiceUrl";

// region 대사 상황 목록
const DIALOGUE_TYPES = [
  "quote", "monologue", "greeting", "roll_call", "deploy",
  "battle_win", "battle_draw", "battle_lose", "clash_attack",
] as const;
// endregion

interface LineItem { type: string; variant: number; text: string }

interface Props {
  lines: Record<string, string[]>;
  nickname: string;
  avatarUrl: string | null;
  hasVoice: boolean;
  celebId: string;
  voiceV?: number;
  voiceSpeed?: number;
}

export default function DialogueSection({ lines, hasVoice, celebId, voiceV = 0, voiceSpeed = 1.0 }: Props) {
  const t = useTranslations("celebPage");
  const locale = useLocale() as Locale;
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoQueueRef = useRef<LineItem[]>([]);
  const stoppedRef = useRef(false);

  // region 개별 재생
  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingKey(null);
  }, []);

  const playOne = useCallback((type: string, variant: number, onEnd?: () => void) => {
    stopAudio();
    const key = `${type}-${variant}`;
    const url = type === "quote"
      ? getQuoteVoiceUrl(celebId, locale, voiceV)
      : type === "monologue"
      ? getMonologueVoiceUrl(celebId, locale, voiceV)
      : getVoiceUrl(celebId, locale, type, variant + 1, voiceV);
    const audio = new Audio(url);
    audio.volume = 0.7;
    if (voiceSpeed !== 1.0) audio.playbackRate = voiceSpeed;
    const cleanup = () => { setPlayingKey(null); audioRef.current = null; onEnd?.(); };
    audio.addEventListener("ended", cleanup, { once: true });
    audio.addEventListener("error", cleanup, { once: true });
    audio.play().catch(() => cleanup());
    audioRef.current = audio;
    setPlayingKey(key);
  }, [celebId, locale, voiceV, voiceSpeed, stopAudio]);

  const toggleOne = useCallback((type: string, variant: number) => {
    // 전체 재생 중이면 중단
    if (autoPlaying) {
      stoppedRef.current = true;
      setAutoPlaying(false);
      autoQueueRef.current = [];
      stopAudio();
      return;
    }
    const key = `${type}-${variant}`;
    if (playingKey === key) {
      stopAudio();
    } else {
      playOne(type, variant);
    }
  }, [playingKey, playOne, stopAudio, autoPlaying]);
  // endregion

  // region 전체 순차 재생
  const allLines = DIALOGUE_TYPES.flatMap((type) => {
    const arr = lines[type];
    if (!Array.isArray(arr)) return [];
    return arr.reduce<LineItem[]>((acc, raw, i) => {
      const text = stripEmotionTag(raw);
      if (text.trim()) acc.push({ type, variant: i, text });
      return acc;
    }, []);
  });

  const playNext = useCallback(function playNextLine() {
    if (stoppedRef.current || autoQueueRef.current.length === 0) {
      setAutoPlaying(false);
      setPlayingKey(null);
      return;
    }
    const next = autoQueueRef.current.shift()!;
    playOne(next.type, next.variant, playNextLine);
  }, [playOne]);

  const toggleAutoPlay = useCallback(() => {
    if (autoPlaying) {
      stoppedRef.current = true;
      setAutoPlaying(false);
      autoQueueRef.current = [];
      stopAudio();
      return;
    }
    stoppedRef.current = false;
    autoQueueRef.current = [...allLines];
    setAutoPlaying(true);
    playNext();
  }, [autoPlaying, allLines, playNext, stopAudio]);
  // endregion

  // 언마운트 시 정리
  useEffect(() => () => { stopAudio(); }, [stopAudio]);

  const visibleTypes = DIALOGUE_TYPES.filter((type) => {
    const arr = lines[type];
    return Array.isArray(arr) && arr.length > 0 && arr.some((l) => l.trim() !== "");
  });

  if (visibleTypes.length === 0) return null;

  return (
    <div className="space-y-5">
      {/* 전체 재생 컨트롤 */}
      {hasVoice && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAutoPlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${autoPlaying ? "bg-accent/20 text-accent" : "bg-bg-secondary text-text-secondary hover:text-accent"}`}
          >
            {autoPlaying ? <Square size={12} /> : <ListMusic size={12} />}
            {autoPlaying ? t("dialogueStop") : t("dialoguePlayAll")}
          </button>
        </div>
      )}

      {visibleTypes.map((type) => (
        <div key={type}>
          <h4 className="text-xs font-medium text-accent/70 mb-2 tracking-wide uppercase">
            {t(`dialogue_${type}`)}
          </h4>
          <div className="space-y-1">
            {lines[type].map((raw, i) => {
              const text = stripEmotionTag(raw);
              if (!text.trim()) return null;
              const key = `${type}-${i}`;
              const isPlaying = playingKey === key;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 ${isPlaying ? "bg-accent/10" : ""}`}
                >
                  {hasVoice && (
                    <button
                      type="button"
                      onClick={() => toggleOne(type, i)}
                      className={`flex-shrink-0 p-0.5 rounded-full ${isPlaying ? "text-accent" : " hover:text-accent"}`}
                      aria-label={isPlaying ? t("stopAudio") : t("playAudio")}
                    >
                      {isPlaying ? <Square size={12} /> : <Play size={12} />}
                    </button>
                  )}
                  <span className={`text-sm leading-relaxed flex-1 break-keep ${isPlaying ? "text-accent" : "text-text-secondary"}`}>
                    &ldquo;{text}&rdquo;
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
