"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ListMusic, Square, Check, Copy, Info } from "lucide-react";
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

type Scope = "all" | DialogueType;

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
  const [activeScope, setActiveScope] = useState<Scope>("all");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoQueueRef = useRef<LineItem[]>([]);
  const stoppedRef = useRef(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyLine = useCallback((key: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedKey(null), 1500);
  }, []);

  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

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

  // 현재 스코프(전체 | 특정 유형)에서 표시·재생할 대사 목록
  const displayLines = useMemo(() => {
    if (activeScope === "all") return allLines;
    const arr = lines[activeScope];
    if (!Array.isArray(arr)) return [];
    return arr.reduce<LineItem[]>((acc, raw, i) => {
      const text = stripEmotionTag(raw);
      if (text.trim()) acc.push({ type: activeScope, variant: i, text });
      return acc;
    }, []);
  }, [activeScope, allLines, lines]);

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
    if (displayLines.length === 0) return;
    stoppedRef.current = false;
    autoQueueRef.current = [...displayLines];
    setAutoPlaying(true);
    playNext();
  }, [autoPlaying, displayLines, playNext, stopAudio]);
  // endregion

  // 언마운트 시 정리
  useEffect(() => () => { stopAudio(); }, [stopAudio]);

  const visibleTypes = useMemo(() => DIALOGUE_TYPES.filter((type) => {
    const arr = lines[type];
    return Array.isArray(arr) && arr.length > 0 && arr.some((l) => l.trim() !== "");
  }), [lines]);
  const scope: Scope = activeScope === "all" || visibleTypes.includes(activeScope)
    ? activeScope
    : "all";

  const selectScope = useCallback((next: Scope) => {
    stoppedRef.current = true;
    autoQueueRef.current = [];
    setAutoPlaying(false);
    stopAudio();
    setActiveScope(next);
  }, [stopAudio]);

  // 전체 재생 중 현재 재생 중인 행의 표시 인덱스
  const playingIndex = useMemo(() => {
    if (!playingKey) return -1;
    return displayLines.findIndex((l) => `${l.type}-${l.variant}` === playingKey);
  }, [playingKey, displayLines]);
  const isAudioPlaying = playingKey !== null;

  if (visibleTypes.length === 0) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-1.5">
        <Info size={13} className="shrink-0 text-text-secondary/70" aria-hidden />
        <p className="max-w-3xl break-keep text-center text-xs leading-relaxed text-text-secondary/70">
          {t("dialogueDescription")}
        </p>
      </div>

      <div
        className="flex flex-wrap justify-center gap-2 pb-1"
        role="tablist"
        aria-label={t("mediaDialogues")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={scope === "all"}
          aria-controls="dialogue-panel-all"
          onClick={() => selectScope("all")}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs hover:border-accent/45 hover:text-accent ${
            scope === "all"
              ? "border-accent/55 bg-accent/10 font-semibold text-accent"
              : "border-white/10 text-text-secondary hover:bg-white/[0.035]"
          }`}
        >
          {t("dialogueAll")}
          <span className="font-mono text-[11px] opacity-65">{allLines.length}</span>
        </button>
        {visibleTypes.map((type) => {
          const count = lines[type].filter((raw) => stripEmotionTag(raw).trim()).length;
          const active = scope === type;
          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`dialogue-panel-${type}`}
              onClick={() => selectScope(type)}
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

      <div
        id={`dialogue-panel-${scope}`}
        role="tabpanel"
        className="rounded-xl border border-white/10 bg-white/[0.018] px-3 py-3"
      >
        {hasVoice && (
          <div className="mb-2 flex items-center justify-center gap-3 border-b border-white/10 px-1 pb-2.5">
            <span className="font-mono text-[11px] tabular-nums text-text-secondary/70">
              {isAudioPlaying && playingIndex >= 0
                ? `${playingIndex + 1} / ${displayLines.length}`
                : `0 / ${displayLines.length}`}
            </span>
            <span className={`flex h-3 items-center gap-[2px] ${isAudioPlaying ? "" : "opacity-40"}`} aria-hidden>
              <span className={`h-full w-[2px] rounded-full ${isAudioPlaying ? "bg-emerald-400 animate-eq-bar" : "bg-text-secondary/60"}`} />
              <span className={`h-full w-[2px] rounded-full ${isAudioPlaying ? "bg-emerald-400 animate-eq-bar" : "bg-text-secondary/60"}`} style={{ animationDelay: "0.15s" }} />
              <span className={`h-full w-[2px] rounded-full ${isAudioPlaying ? "bg-emerald-400 animate-eq-bar" : "bg-text-secondary/60"}`} style={{ animationDelay: "0.3s" }} />
            </span>
            <button
              type="button"
              onClick={toggleAutoPlay}
              aria-label={autoPlaying ? t("dialogueStop") : t("dialoguePlayAll")}
              className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full border ${
                autoPlaying
                  ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-400"
                  : "border-accent/40 bg-accent/10 text-accent hover:border-accent/70 hover:bg-accent/15"
              }`}
            >
              {autoPlaying ? <Square size={14} /> : <ListMusic size={14} />}
            </button>
          </div>
        )}

        <div className="max-h-[340px] space-y-1 overflow-y-auto md:max-h-[420px]">
          {displayLines.map((item, i) => {
            const key = `${item.type}-${item.variant}`;
            const isPlaying = playingKey === key;
            return (
              <div
                key={key}
                role={hasVoice ? "button" : undefined}
                tabIndex={hasVoice ? 0 : undefined}
                onClick={hasVoice ? () => toggleOne(item.type, item.variant) : undefined}
                onKeyDown={hasVoice ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleOne(item.type, item.variant);
                  }
                } : undefined}
                className={`flex items-center gap-2.5 rounded-md px-2 py-2 ${hasVoice ? "cursor-pointer" : ""} ${isPlaying ? "bg-emerald-500/10" : "hover:bg-white/[0.035]"}`}
              >
                <span className={`w-5 shrink-0 text-right font-mono text-[11px] tabular-nums ${isPlaying ? "text-emerald-400/70" : "text-text-secondary/40"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={`flex-1 text-center text-sm leading-relaxed break-keep ${isPlaying ? "text-emerald-400" : "text-text-secondary"}`}>
                  &ldquo;{item.text}&rdquo;
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); copyLine(key, item.text); }}
                  className={`shrink-0 rounded p-1 text-text-secondary/40 hover:text-accent ${copiedKey === key ? "text-accent" : ""}`}
                  aria-label={t("copyLine")}
                >
                  {copiedKey === key ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
