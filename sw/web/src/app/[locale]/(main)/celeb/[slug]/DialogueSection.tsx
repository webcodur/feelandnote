"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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

type DialogueType = (typeof DIALOGUE_TYPES)[number];

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
  const [activeType, setActiveType] = useState<DialogueType | null>(null);
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
  const allLines = useMemo(() => DIALOGUE_TYPES.flatMap((type) => {
    const arr = lines[type];
    if (!Array.isArray(arr)) return [];
    return arr.reduce<LineItem[]>((acc, raw, i) => {
      const text = stripEmotionTag(raw);
      if (text.trim()) acc.push({ type, variant: i, text });
      return acc;
    }, []);
  }), [lines]);

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

  const visibleTypes = useMemo(() => DIALOGUE_TYPES.filter((type) => {
    const arr = lines[type];
    return Array.isArray(arr) && arr.length > 0 && arr.some((l) => l.trim() !== "");
  }), [lines]);
  const selectedType = activeType && visibleTypes.includes(activeType)
    ? activeType
    : visibleTypes[0];

  const selectDialogueType = useCallback((type: DialogueType) => {
    stoppedRef.current = true;
    autoQueueRef.current = [];
    setAutoPlaying(false);
    stopAudio();
    setActiveType(type);
  }, [stopAudio]);

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

      <div
        className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide"
        role="tablist"
        aria-label={t("mediaDialogues")}
      >
        {visibleTypes.map((type) => {
          const count = lines[type].filter((raw) => stripEmotionTag(raw).trim()).length;
          const active = selectedType === type;
          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`dialogue-panel-${type}`}
              onClick={() => selectDialogueType(type)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs hover:border-accent/45 hover:text-accent ${
                active
                  ? "border-accent/55 bg-accent/10 font-semibold text-accent"
                  : "border-white/10 text-text-secondary hover:bg-white/[0.035]"
              }`}
            >
              {t(`dialogue_${type}`)}
              <span className="font-mono text-[11px] opacity-65">{count}</span>
            </button>
          );
        })}
      </div>

      {selectedType && (
        <div
          id={`dialogue-panel-${selectedType}`}
          role="tabpanel"
          className="space-y-1 rounded-xl border border-white/10 bg-white/[0.018] px-3 py-3"
        >
          {lines[selectedType].map((raw, i) => {
            const text = stripEmotionTag(raw);
            if (!text.trim()) return null;
            const key = `${selectedType}-${i}`;
            const isPlaying = playingKey === key;
            return (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-md px-2 py-2 ${isPlaying ? "bg-accent/10" : "hover:bg-white/[0.025]"}`}
              >
                {hasVoice && (
                  <button
                    type="button"
                    onClick={() => toggleOne(selectedType, i)}
                    className={`mt-0.5 shrink-0 rounded-full p-1 hover:bg-white/5 hover:text-accent ${isPlaying ? "text-accent" : "text-text-secondary"}`}
                    aria-label={isPlaying ? t("stopAudio") : t("playAudio")}
                  >
                    {isPlaying ? <Square size={12} /> : <Play size={12} />}
                  </button>
                )}
                <span className={`flex-1 text-sm leading-relaxed break-keep ${isPlaying ? "text-accent" : "text-text-secondary"}`}>
                  &ldquo;{text}&rdquo;
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
