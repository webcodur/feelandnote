/* ─────────────────────────────────────────────
 * [celeb 상세] dialogue — 게임 대사 재생(상황별·음성)
 * - 목차 위치: media > dialogues
 * - 데이터: lines/nickname/hasVoice/celebId/voiceV/voiceSpeed props
 * - 함께 보기: FigureMediaTabs.tsx, VideosSection.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ListMusic, Square, Info, LoaderCircle } from "lucide-react";
import { CELEB_DIALOGUE_SITUATIONS } from "@feelandnote/shared/constants/celeb-speech";
import type { Locale } from "@/types/locale";
import { stripEmotionTag } from "@/components/features/game/shared/hooks/useDialogue";
import { getVoiceUrl, getQuoteVoiceUrl, getMonologueVoiceUrl } from "@/lib/game/voice/voiceUrl";

/* ── 1. 대사 상황·테마 ── */
// region 대사 상황 목록
const DIALOGUE_TYPES = [
  "quote", "monologue", ...CELEB_DIALOGUE_SITUATIONS,
] as const;
// endregion

type DialogueType = (typeof DIALOGUE_TYPES)[number];

interface DialogueTheme {
  chipActive: string;
  row: string;
  rowPlaying: string;
}

// 켜진 칩은 색을 꽉 채우고 어두운 글자를 얹는다. 꺼진 칩은 아래 INACTIVE_CHIP 하나로 통일해
// "칠해진 것 = 켜짐"이 색상과 무관하게 한눈에 갈린다.
const INACTIVE_CHIP =
  "border-white/10 bg-white/[0.03] text-text-secondary/70 hover:border-white/25 hover:bg-white/[0.07] hover:text-text-secondary";

const DIALOGUE_THEMES: Record<DialogueType, DialogueTheme> = {
  quote: {
    chipActive: "border-amber-300 bg-amber-400 font-semibold text-neutral-900",
    row: "border-s-amber-400/70 bg-amber-400/[0.04] hover:bg-amber-400/10",
    rowPlaying: "border-s-amber-300 bg-amber-400/15 ring-1 ring-inset ring-amber-300/30",
  },
  monologue: {
    chipActive: "border-violet-300 bg-violet-400 font-semibold text-neutral-900",
    row: "border-s-violet-400/70 bg-violet-400/[0.04] hover:bg-violet-400/10",
    rowPlaying: "border-s-violet-300 bg-violet-400/15 ring-1 ring-inset ring-violet-300/30",
  },
  greeting: {
    chipActive: "border-sky-300 bg-sky-400 font-semibold text-neutral-900",
    row: "border-s-sky-400/70 bg-sky-400/[0.04] hover:bg-sky-400/10",
    rowPlaying: "border-s-sky-300 bg-sky-400/15 ring-1 ring-inset ring-sky-300/30",
  },
  roll_call: {
    chipActive: "border-teal-300 bg-teal-400 font-semibold text-neutral-900",
    row: "border-s-teal-400/70 bg-teal-400/[0.04] hover:bg-teal-400/10",
    rowPlaying: "border-s-teal-300 bg-teal-400/15 ring-1 ring-inset ring-teal-300/30",
  },
  deploy: {
    chipActive: "border-indigo-300 bg-indigo-400 font-semibold text-neutral-900",
    row: "border-s-indigo-400/70 bg-indigo-400/[0.04] hover:bg-indigo-400/10",
    rowPlaying: "border-s-indigo-300 bg-indigo-400/15 ring-1 ring-inset ring-indigo-300/30",
  },
  battle_win: {
    chipActive: "border-emerald-300 bg-emerald-400 font-semibold text-neutral-900",
    row: "border-s-emerald-400/70 bg-emerald-400/[0.04] hover:bg-emerald-400/10",
    rowPlaying: "border-s-emerald-300 bg-emerald-400/15 ring-1 ring-inset ring-emerald-300/30",
  },
  battle_draw: {
    chipActive: "border-lime-300 bg-lime-400 font-semibold text-neutral-900",
    row: "border-s-lime-400/70 bg-lime-400/[0.04] hover:bg-lime-400/10",
    rowPlaying: "border-s-lime-300 bg-lime-400/15 ring-1 ring-inset ring-lime-300/30",
  },
  battle_lose: {
    chipActive: "border-rose-300 bg-rose-400 font-semibold text-neutral-900",
    row: "border-s-rose-400/70 bg-rose-400/[0.04] hover:bg-rose-400/10",
    rowPlaying: "border-s-rose-300 bg-rose-400/15 ring-1 ring-inset ring-rose-300/30",
  },
  clash_attack: {
    chipActive: "border-orange-300 bg-orange-400 font-semibold text-neutral-900",
    row: "border-s-orange-400/70 bg-orange-400/[0.04] hover:bg-orange-400/10",
    rowPlaying: "border-s-orange-300 bg-orange-400/15 ring-1 ring-inset ring-orange-300/30",
  },
};

interface LineItem { type: DialogueType; variant: number; text: string }

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
  // 로드 대기 중인 행. 로딩이 끝나기 전에는 소리를 내지 않는다.
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [autoPlaying, setAutoPlaying] = useState(false);
  // 체크박스처럼 여러 개를 겹쳐 켜지 않는다 — 상황 하나를 고르면 그 모드로 통째로 바뀐다.
  // 처음엔 대사가 있는 첫 상황을 고른다.
  const [selectedType, setSelectedType] = useState<DialogueType | null>(() => DIALOGUE_TYPES.find((type) => {
    const arr = lines[type];
    return Array.isArray(arr) && arr.length > 0 && arr.some((l) => l.trim() !== "");
  }) ?? null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoQueueRef = useRef<LineItem[]>([]);
  const stoppedRef = useRef(false);
  // 받아둔 오디오 엘리먼트 보관. 같은 행을 다시 누르면 로딩 표시 없이 바로 낸다.
  const audioCacheRef = useRef(new Map<string, HTMLAudioElement>());

/* ── 2. 개별 재생 ── */
  // region 개별 재생
  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingKey(null);
    setLoadingKey(null);
  }, []);

  const getUrl = useCallback((type: string, variant: number) =>
    type === "quote"
      ? getQuoteVoiceUrl(celebId, locale, voiceV)
      : type === "monologue"
      ? getMonologueVoiceUrl(celebId, locale, voiceV)
      : getVoiceUrl(celebId, locale, type, variant + 1, voiceV),
  [celebId, locale, voiceV]);

  // 손대기 전에 미리 받아둔다. hover·포커스 시점에 조용히 로딩만 건다.
  const prefetchOne = useCallback((type: string, variant: number) => {
    if (!hasVoice) return;
    const key = `${type}-${variant}`;
    if (audioCacheRef.current.has(key)) return;
    const audio = new Audio(getUrl(type, variant));
    audio.preload = "auto";
    audioCacheRef.current.set(key, audio);
    audio.load();
  }, [getUrl, hasVoice]);

  const playOne = useCallback((type: string, variant: number, onEnd?: () => void) => {
    stopAudio();
    const key = `${type}-${variant}`;
    let audio = audioCacheRef.current.get(key) ?? null;
    if (!audio || audio.error) {
      if (audio) audioCacheRef.current.delete(key);
      audio = new Audio(getUrl(type, variant));
      audio.preload = "auto";
      audioCacheRef.current.set(key, audio);
    }
    audio.volume = 0.7;
    if (voiceSpeed !== 1.0) audio.playbackRate = voiceSpeed;
    let settled = false;
    // canplaythrough도 error도 없이 멈추면 무한 대기에 빠지므로 20초 뒤 정리
    const stallTimer = window.setTimeout(() => fail(), 20000);
    const cleanup = () => {
      window.clearTimeout(stallTimer);
      setLoadingKey(null);
      setPlayingKey(null);
      // 끝난 오디오가 현재 것과 다르면(이미 다음 재생이 시작됨) 손대지 않는다
      if (audioRef.current === audio) audioRef.current = null;
      onEnd?.();
    };
    const fail = () => { if (!settled) { settled = true; cleanup(); } };
    const begin = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(stallTimer);
      setLoadingKey(null);
      audio.play().then(() => {
        // 그 사이 다른 재생이 시작됐으면 얌전히 물러난다
        if (audioRef.current !== audio) { audio.pause(); return; }
        setPlayingKey(key);
      }).catch(() => cleanup());
    };
    // 핸들러는 재생마다 갈아낀다. 보관 엘리먼트를 돌려쓰므로 addEventListener 누적 방지.
    audio.onended = cleanup;
    audio.onerror = fail;
    audioRef.current = audio;
    if (audio.readyState >= 3) {
      // 이미 받아져 있다 — 로딩 표시 없이 처음부터 바로 낸다
      audio.currentTime = 0;
      begin();
      return;
    }
    // 끊김 없이 통으로 재생할 만큼 받아진 뒤에만 소리를 낸다
    setLoadingKey(key);
    audio.oncanplaythrough = begin;
    audio.load();
  }, [getUrl, voiceSpeed, stopAudio]);

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
    // 로딩 중 다시 누르면 취소, 재생 중 다시 누르면 정지
    if (loadingKey === key || playingKey === key) {
      stopAudio();
    } else {
      playOne(type, variant);
    }
  }, [loadingKey, playingKey, playOne, stopAudio, autoPlaying]);
  // endregion

/* ── 3. 전체 순차 재생 ── */
  // region 전체 순차 재생
  const linesForType = useCallback((type: DialogueType): LineItem[] => {
    const arr = lines[type];
    if (!Array.isArray(arr)) return [];
    return arr.reduce<LineItem[]>((acc, raw, i) => {
      const text = stripEmotionTag(raw);
      if (text.trim()) acc.push({ type, variant: i, text });
      return acc;
    }, []);
  }, [lines]);

  // 고른 상황 하나만 보여준다 — "전체" 모드는 없다
  const displayLines = useMemo(
    () => selectedType ? linesForType(selectedType) : [],
    [selectedType, linesForType],
  );

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

  // 언마운트 시 정리. 보관 엘리먼트도 놓아 버퍼를 반환한다.
  useEffect(() => () => {
    stopAudio();
    audioCacheRef.current.forEach((cached) => cached.pause());
    audioCacheRef.current.clear();
  }, [stopAudio]);

  const visibleTypes = useMemo(() => DIALOGUE_TYPES.filter((type) => {
    const arr = lines[type];
    return Array.isArray(arr) && arr.length > 0 && arr.some((l) => l.trim() !== "");
  }), [lines]);

  const selectType = useCallback((type: DialogueType) => {
    stoppedRef.current = true;
    autoQueueRef.current = [];
    setAutoPlaying(false);
    stopAudio();
    setSelectedType(type);
  }, [stopAudio]);

  // 전체 재생 중 현재 재생 중인 행의 표시 인덱스
  const playingIndex = useMemo(() => {
    if (!playingKey) return -1;
    return displayLines.findIndex((l) => `${l.type}-${l.variant}` === playingKey);
  }, [playingKey, displayLines]);
  const isAudioPlaying = playingKey !== null || loadingKey !== null;

  if (visibleTypes.length === 0) return null;

  return (
    // 게임용 창작 대사다. 실제 발언이 아니므로 검색 스니펫·AI 답변 인용에서 제외한다.
    <div className="space-y-5" data-nosnippet>
      <div className="flex items-center justify-center gap-1.5">
        <Info size={13} className="shrink-0 text-text-secondary/70" aria-hidden />
        <p className="max-w-3xl break-keep text-center text-xs leading-relaxed text-text-secondary/70">
          {t("dialogueDescription")}
        </p>
      </div>

      {/* ── 4. 상황 칩 — 체크박스가 아니라 모드 전환이다. 하나를 고르면 그걸로 통째로 바뀐다 */}
      <div
        className="flex flex-wrap justify-center gap-2 pb-1"
        role="group"
        aria-label={t("mediaDialogues")}
      >
        {visibleTypes.map((type) => {
          const count = lines[type].filter((raw) => stripEmotionTag(raw).trim()).length;
          const active = selectedType === type;
          const theme = DIALOGUE_THEMES[type];
          return (
            <button
              key={type}
              type="button"
              aria-pressed={active}
              onClick={() => selectType(type)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                active
                  ? theme.chipActive
                  : INACTIVE_CHIP
              }`}
            >
              {t(`dialogue_${type}`)}
              <span className={`font-mono text-[11px] ${active ? "opacity-70" : "opacity-50"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── 5. 대사 목록 패널 ── */}
      <div
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
          {displayLines.map((item) => {
            const key = `${item.type}-${item.variant}`;
            const isPlaying = playingKey === key;
            const isLoading = loadingKey === key;
            const theme = DIALOGUE_THEMES[item.type];
            return (
              <div
                key={key}
                role={hasVoice ? "button" : undefined}
                tabIndex={hasVoice ? 0 : undefined}
                aria-busy={isLoading || undefined}
                onMouseEnter={hasVoice ? () => prefetchOne(item.type, item.variant) : undefined}
                onFocus={hasVoice ? () => prefetchOne(item.type, item.variant) : undefined}
                onClick={hasVoice ? () => toggleOne(item.type, item.variant) : undefined}
                onKeyDown={hasVoice ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleOne(item.type, item.variant);
                  }
                } : undefined}
                className={`flex items-center gap-2 rounded-md border-s-2 px-2 py-2 text-text-primary ${hasVoice ? "cursor-pointer" : ""} ${isPlaying || isLoading ? theme.rowPlaying : theme.row}`}
              >
                {isLoading && (
                  <LoaderCircle size={14} aria-hidden className="shrink-0 animate-spin text-text-secondary" />
                )}
                {/* 재생 중에는 텍스트 아래로 진행광이 스친다. 글자색은 그대로 둔다 */}
                <span className={`w-full break-keep text-center text-sm leading-relaxed ${isPlaying ? "bg-[linear-gradient(90deg,transparent_0%,currentColor_50%,transparent_100%)] bg-[length:35%_2px] bg-no-repeat motion-safe:animate-dialogue-flow" : ""}`}>
                  &ldquo;{item.text}&rdquo;
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
